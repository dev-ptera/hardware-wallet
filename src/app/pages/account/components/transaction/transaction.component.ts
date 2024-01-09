import { Component, Input, ViewEncapsulation } from '@angular/core';
import * as Colors from '@brightlayer-ui/colors';
import { ConfirmedTx } from '@app/types/ConfirmedTx';
import { UtilService } from '@app/services/util.service';
import { ViewportService } from '@app/services/viewport.service';
import { ThemeService } from '@app/services/theme.service';
import { AccountService } from '@app/services/account.service';
import { AppStateService } from '@app/services/app-state.service';

@Component({
    selector: 'app-transaction',
    template: `
        <div class="transaction-row-wrapper" [style.height.px]="transactionRowHeight">
            <div class="transaction-row" [class.divider-border]="vp.sm" [style.backgroundColor]="getRowBgColor(even)">
                <div *ngIf="!item">
                    <!--Left Content -->
                    <div>
                        <div class="tx-state-icon">
                            <mat-icon icon>sync</mat-icon>
                        </div>
                        <div class="mat-body-1">Loading</div>
                    </div>

                    <!--Right Content -->
                    <div>
                        <span *ngIf="!vp.sm" [style.marginLeft.px]="32" class="mat-body-1"> tx # </span>
                    </div>
                </div>

                <div *ngIf="item">
                    <!--Left Content -->
                    <div>
                        <div class="tx-state-icon">
                            <mat-icon *ngIf="item.type === 'receive'" class="receive">add_circle_outline</mat-icon>
                            <mat-icon *ngIf="item.type === 'send'" class="send">remove_circle_outline</mat-icon>
                            <mat-icon *ngIf="item.type === 'change'" class="change">change_history</mat-icon>
                        </div>
                        <div style="flex-direction: column; align-items: flex-start">
                            <div class="mat-body-1 type">{{ item.type }}</div>
                            <div class="mat-body-2">{{ item.amount }}</div>
                        </div>
                    </div>

                    <!--Right Content -->
                    <div>
                        <div
                            (mouseenter)="item.hover = true"
                            (mouseleave)="item.hover = false"
                            [class.mat-body-1]="!vp.sm"
                            [class.mat-body-2]="vp.sm"
                        >
                            <ng-container *ngIf="!vp.sm">
                                <span *ngIf="item.type === 'receive'">from </span>
                                <span *ngIf="item.type === 'send' || item.type === 'change'">to </span>
                            </ng-container>
                            <div
                                class="link accounts-hash-link"
                                [style.marginLeft.px]="8"
                                (click)="openLink(item.hash)"
                            >
                                <ng-container *ngIf="item.type === 'receive' || item.type === 'send'">
                                    {{ formatAddress(item.address) }}
                                </ng-container>
                                <ng-container *ngIf="item.type === 'change'">
                                    {{ formatAddress(item.newRepresentative) }}
                                </ng-container>
                            </div>
                            <div class="copy-address-button">
                                <button mat-icon-button *ngIf="item.hover" (click)="copyTransactionAddress(item)">
                                    <mat-icon style="font-size: 16px">{{
                                        item.showCopiedIcon ? 'check_circle' : 'content_copy'
                                    }}</mat-icon>
                                </button>
                            </div>
                        </div>
                        <span
                            *ngIf="!vp.md && !vp.sm"
                            [style.marginLeft.px]="16"
                            class="mat-body-1"
                            style="min-width: 140px; text-align:right"
                        >
                            {{ item.relativeTime }}
                        </span>
                        <span
                            *ngIf="!vp.sm"
                            [style.marginLeft.px]="16"
                            class="mat-body-1"
                            style="min-width: 100px; text-align:right"
                        >
                            tx #{{ item.height | appComma }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `,
    styleUrls: ['./transaction.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class TransactionComponent {
    @Input() item: ConfirmedTx;
    @Input() even: boolean;
    @Input() transactionRowHeight: number;

    colors = Colors;

    constructor(
        public util: UtilService,
        public vp: ViewportService,
        private readonly _themeService: ThemeService,
        private readonly _accountService: AccountService,
        private readonly _appStateService: AppStateService
    ) {}

    /** Copies transaction sender, recipient, or new representative to clipboard. */
    copyTransactionAddress(item: ConfirmedTx): void {
        this.util.clipboardCopy(item.address || item.newRepresentative);
        item.showCopiedIcon = true;
        setTimeout(() => {
            item.showCopiedIcon = false;
        }, 700);
    }

    /** Shows alias (if exists) or shortened address. */
    formatAddress(address: string): string {
        return (
            this._appStateService.store.getValue().addressBook.get(address) ||
            this._appStateService.knownAccounts.get(address) ||
            this.util.shortenAddress(address)
        );
    }

    /** Open link in an explorer, defaults to YellowSpyglass. */
    openLink(hash: string): void {
        this._accountService.showBlockInExplorer(hash);
    }

    /** Useful for alternating row colors. */
    isDark(): boolean {
        return this._themeService.isDark();
    }

    getRowBgColor(even: boolean): string {
        return even || this.vp.sm
            ? this.isDark()
                ? this.colors.darkBlack[300]
                : this.colors.white[100]
            : this.isDark()
            ? this.colors.darkBlack[200]
            : this.colors.white[50];
    }
}
