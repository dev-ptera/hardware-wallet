import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { AccountInfoResponse } from '@dev-ptera/nano-node-rpc';
import { AccountOverview } from '@app/types/AccountOverview';
import { DatasourceService } from '@app/services/datasource.service';
import { SignerService } from '@app/services/signer.service';
import { ReceivableHash } from '@app/types/ReceivableHash';
import { TransactionBlock } from '@app/types/TransactionBlock';
import { AppStateService } from '@app/services/app-state.service';

const LOG_ERR = (err: any): any => {
    console.error(`ERROR: Issue fetching RPC data.  ${err}`);
    return err;
};

type UnopenedAccountResponse = {
    unopenedAccount: true;
};

@Injectable({
    providedIn: 'root',
})
/** RPC calls using the nano RPC and the @dev-ptera/nano-node-rpc client.
 *
 *  All functions in this service can have its NanoClient datasource switched without any issues.
 * */
export class RpcService {
    constructor(
        private readonly _util: UtilService,
        private readonly _appStateService: AppStateService,
        private readonly _datasourceService: DatasourceService,
        private readonly _signerService: SignerService
    ) {}

    /** Returns number of confirmed transactions an account has. */
    async getAccountHeight(address: string): Promise<number> {
        const client = await this._datasourceService.getRpcClient();
        const accountInfo = await client.account_info(address).catch((err) => Promise.reject(LOG_ERR(err)));
        return Number(accountInfo.confirmation_height);
    }

    /** Returns array of receivable transactions, sorted by balance descending. */
    async getReceivable(address: string): Promise<ReceivableHash[]> {
        const MAX_PENDING = 100;
        const threshold = this._util.convertBanToRaw(this._appStateService.store.getValue().minimumBananoThreshold);
        const client = await this._datasourceService.getRpcClient();
        const pendingRpcData = await client
            .accounts_pending([address], MAX_PENDING, { sorting: true, threshold })
            .catch((err) => {
                LOG_ERR(err);
                return Promise.resolve({
                    blocks: '',
                });
            });
        const pendingBlocks = pendingRpcData.blocks[address];
        if (!pendingBlocks) {
            return [];
        }
        const receivables = [];
        const hashes = [...Object.keys(pendingBlocks)];
        for (const hash of hashes) {
            const receivableRaw = pendingBlocks[hash];
            receivables.push({ hash, receivableRaw });
        }
        return receivables;
    }

    /** Returns a modified account info object, given an index. */
    // Make this accept a public address, yeah? // TODO
    async getAccountInfoFromIndex(index: number, address?: string): Promise<AccountOverview> {
        let publicAddress = address;
        if (!publicAddress) {
            publicAddress = await this._signerService.getAccountFromIndex(index);
        }
        const client = await this._datasourceService.getRpcClient();
        const accountInfoRpc = await client.account_info(publicAddress, { representative: true }).catch((err) => {
            if (err.error === 'Account not found') {
                return Promise.resolve({
                    unopenedAccount: true,
                } as UnopenedAccountResponse);
            }
            LOG_ERR(err);
        });
        const accountOverview = this._formatAccountInfoResponse(index, publicAddress, accountInfoRpc);
        return accountOverview;
    }

    /** Handles some data formatting; transforms account_info rpc data into some formatted dashboard data. */
    private _formatAccountInfoResponse(
        index: number,
        address: string,
        rpcData: AccountInfoResponse | UnopenedAccountResponse
    ): AccountOverview {
        // If account is not opened, return a placeholder account.
        if ((rpcData as UnopenedAccountResponse).unopenedAccount) {
            return {
                index,
                shortAddress: this._util.shortenAddress(address),
                fullAddress: address,
                formattedBalance: '0',
                blockCount: 0,
                balance: 0,
                lastUpdatedTimestamp: undefined,
                balanceRaw: '0',
                frontier: undefined,
                representative: undefined,
                pending: [],
            };
        }

        const accountInfo = rpcData as AccountInfoResponse;
        const balance = this._util.convertRawToBan(accountInfo.balance);

        return {
            index,
            pending: [],
            balance: Number(balance),
            balanceRaw: accountInfo.balance,
            fullAddress: address,
            blockCount: Number(accountInfo.block_count),
            lastUpdatedTimestamp: accountInfo.modified_timestamp,
            shortAddress: this._util.shortenAddress(address),
            formattedBalance: this._util.numberWithCommas(balance, 6),
            representative: accountInfo.representative,
            frontier: accountInfo.frontier,
        };
    }

    /** Given a hash, tells our RPC datasource to stop calculating work to process a transaction. */
    async cancelWorkGenerate(hash: string): Promise<any> {
        const client = await this._datasourceService.getRpcClient();
        // eslint-disable-next-line no-console
        console.log('Canceling server-side work generate request');
        return new Promise((resolve) => {
            client.work_cancel(hash).then(resolve).catch(resolve);
        });
    }

    async generateWork(hash: string): Promise<string> {
        const client = await this._datasourceService.getRpcClient();
        const response = await client.work_generate(hash);
        return response.work;
    }

    async process(block: TransactionBlock, type: 'send' | 'receive' | 'change' | 'open'): Promise<string> {
        const client = await this._datasourceService.getRpcClient();
        const datasource = await this._datasourceService.getRpcSource();
        const processReq = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            json_block: true,
            subtype: type,
            block: block,
        };

        // Kalium specific.
        if (block.work === undefined && datasource.alias === 'Kalium') {
            processReq['do_work'] = true;
        }
        const response = await client.process(processReq);
        return response.hash;
    }
}
