import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as Colors from '@brightlayer-ui/colors';
import { TransactionService } from '@app/services/transaction.service';
import { AppStateService } from '@app/services/app-state.service';
import { ReceivableHash } from '@app/types/ReceivableHash';
import { TRANSACTION_COMPLETED_SUCCESS } from '@app/services/wallet-events.service';

export type ReceiveOverlayData = {
    address: string;
    index: number;
    blocks: ReceivableHash[];
};

@Component({
    selector: 'app-receive-overlay',
    styleUrls: ['receive.component.scss'],
    template: `
        <div class="receive-overlay">
            <div
                *ngIf="hasSuccess"
                mat-dialog-content
                style="display: flex; justify-content: center; flex:  1 1 0px; padding-bottom: 16px;"
            >
                <app-empty-state data-cy="receive-success-state">
                    <mat-icon blui-empty-icon> check_circle</mat-icon>
                    <div blui-title>Received Successfully</div>
                    <div blui-description>
                        All transactions have been successfully received. You can now close this window.
                    </div>
                    <div blui-actions>
                        <button mat-flat-button color="primary" class="close-button" (click)="closeDialog()">
                            Close
                        </button>
                    </div>
                </app-empty-state>
            </div>

            <div
                *ngIf="hasErrorReceiving"
                mat-dialog-content
                class="overlay-content"
                style="display: flex; justify-content: center; flex:  1 1 0px; padding-bottom: 16px;"
            >
                <app-empty-state>
                    <mat-icon blui-empty-icon> error</mat-icon>
                    <div blui-title>Transaction Failed</div>
                    <div blui-description>Your transaction could not be completed.</div>
                    <div blui-actions>
                        <button mat-flat-button color="primary" class="close-button" (click)="closeDialog()">
                            Close
                        </button>
                    </div>
                </app-empty-state>
            </div>

            <ng-container *ngIf="!hasSuccess && !hasErrorReceiving">
                <h1 mat-dialog-title>Receive Transaction</h1>
                <div mat-dialog-content style="margin-bottom: 32px;">
                    <ng-container>
                        <div style="margin-bottom: 8px">
                            You are attempting to receive an incoming transaction(s).
                            <ng-container *ngIf="!isLedger"> Use the button below to receive each block.</ng-container>
                            <ng-container *ngIf="isLedger">
                                Use the button below and your ledger device to manually receive each block.
                            </ng-container>
                        </div>
                        <div style="margin-bottom: 8px">
                            <strong>{{ data.blocks.length - activeStep }}</strong> receivable transaction(s) remaining.
                        </div>
                    </ng-container>
                </div>

                <blui-spacer></blui-spacer>
                <mat-progress-bar
                    *ngIf="maxSteps !== 1"
                    mode="determinate"
                    [value]="bufferValue"
                    style="margin-left: -24px; margin-right: -24px; width: unset;"
                ></mat-progress-bar>
                <mat-divider *ngIf="maxSteps === 1" style="margin-left: -48px; margin-right: -48px"></mat-divider>
                <blui-mobile-stepper [activeStep]="activeStep" [steps]="maxSteps" variant="text">
                    <button
                        mat-stroked-button
                        blui-back-button
                        color="primary"
                        data-cy="receive-close-button"
                        (click)="closeDialog()"
                    >
                        Close
                    </button>
                    <button
                        mat-flat-button
                        blui-next-button
                        color="primary"
                        class="loading-button"
                        data-cy="receive-button"
                        (click)="receiveTransaction()"
                    >
                        <div class="spinner-container" data-cy="receive-loading" [class.isLoading]="isReceivingTx">
                            <mat-spinner class="primary-spinner" diameter="20"></mat-spinner>
                        </div>
                        <span *ngIf="!isReceivingTx">Receive</span>
                    </button>
                </blui-mobile-stepper>
            </ng-container>
        </div>
    `,
})
export class ReceiveComponent implements OnInit {
    @Input() data: ReceiveOverlayData;
    @Output() closeWithHash: EventEmitter<string> = new EventEmitter<string>();

    activeStep = 0;
    maxSteps;
    lastStep;

    txHash: string;
    hasErrorReceiving: boolean;
    hasSuccess: boolean;
    isLedger: boolean;
    isReceivingTx: boolean;

    colors = Colors;
    bufferValue = 0;

    constructor(
        private readonly _appStateService: AppStateService,
        private readonly _transactionService: TransactionService
    ) {}

    ngOnInit(): void {
        this.isLedger = this._appStateService.store.getValue().hasUnlockedLedger;
        this.maxSteps = this.data.blocks.length;
        this.lastStep = this.maxSteps - 1;
    }

    closeDialog(): void {
        this.closeWithHash.emit(this.txHash);
    }

    /** Iterates through each pending transaction block and receives them. */
    async receiveTransaction(): Promise<void> {
        this.bufferValue = 0;

        if (this.isReceivingTx) {
            return;
        }

        this.isReceivingTx = true;
        for (const receivableBlock of this.data.blocks) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const receivedHash = await this._transactionService.receive(this.data.index, receivableBlock);
                this.txHash = receivedHash;
                this.activeStep++;
                this.bufferValue = (100 / this.maxSteps) * this.activeStep;
                this.hasSuccess = this.maxSteps === this.activeStep;
            } catch (err) {
                console.error(err);
                this.hasErrorReceiving = true;
                this.isReceivingTx = false;
                return;
            }
        }
        TRANSACTION_COMPLETED_SUCCESS.next(undefined);
    }
}
