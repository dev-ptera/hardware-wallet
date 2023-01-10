import { Component, Input, ViewEncapsulation } from '@angular/core';
import { AccountOverview } from '@app/types/AccountOverview';
import * as Colors from '@brightlayer-ui/colors';
import { COPY_ADDRESS_TO_CLIPBOARD, REMOVE_ACCOUNTS_BY_INDEX } from '@app/services/wallet-events.service';
import { ViewportService } from '@app/services/viewport.service';
import { Router } from '@angular/router';
import { UtilService } from '@app/services/util.service';
import { ThemeService } from '@app/services/theme.service';
import { AccountService } from '@app/services/account.service';
import { AppStateService } from '@app/services/app-state.service';

@Component({
    selector: 'app-account-list',
    styleUrls: ['accounts-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    template: `
        <!-- Account-specific actions. -->
        <ng-template #accountMoreOptions let-account="account">
            <ng-template #accountMoreOptionsTrigger>
                <button
                    mat-icon-button
                    style="margin-left: 8px"
                    [style.marginRight.px]="vp.sm ? -24 : -8"
                    (click)="account.moreOptionsOpen = !account.moreOptionsOpen; $event.stopPropagation()"
                >
                    <mat-icon>more_vert</mat-icon>
                </button>
            </ng-template>
            <ng-template #accountMoreOptionsMenu>
                <button mat-menu-item (click)="copyAccountAddressMobile(account); account.moreOptionsOpen = false">
                    Copy Address
                </button>
                <button mat-menu-item (click)="hideAccount(account)">Hide Account</button>
                <!--
                <button mat-menu-item (click)="openRenameWalletOverlay()">
                    Rename Account
                </button>
                -->
            </ng-template>
            <responsive-menu
                menuTitle="Account"
                [(open)]="account.moreOptionsOpen"
                [menu]="accountMoreOptionsMenu"
                [desktopTrigger]="accountMoreOptionsTrigger"
                [mobileTrigger]="accountMoreOptionsTrigger"
            >
            </responsive-menu>
        </ng-template>

        <!-- Indicates an account has not yet received any transactions -->
        <ng-template #unopenedAccountTag>
            <list-item-tag
                responsive
                label="Unopened Account"
                class="unopened-account-tag"
                [fontColor]="colors.black[500]"
                [backgroundColor]="colors.gray[100]"
            >
            </list-item-tag>
        </ng-template>

        <!-- Statuses that are shown beneath an address.  Includes "Rep Offline" & "Has Receivable" information. -->
        <ng-template #statusBadges let-account="account">
            <div style="display: flex; align-items: center">
                <list-item-tag
                    *ngIf="account.pending.length > 0"
                    [label]="vp.sm ? 'Receivable' : 'Has Receivable'"
                    class="receivable-tag"
                    style="margin-right: 16px"
                    [backgroundColor]="colors.orange[500]"
                >
                </list-item-tag>
                <list-item-tag
                    *ngIf="showRepresentativeOffline(account.representative)"
                    label="Rep Offline"
                    class="rep-offline-tag"
                    [backgroundColor]="colors.red[500]"
                    [fontColor]="colors.white[50]"
                    style="margin-right: 16px"
                ></list-item-tag>
            </div>
        </ng-template>

        <div class="dashboard-account-list" responsive>
            <div
                *ngFor="
                    let account of accounts | sort: sortDirection:accounts.length;
                    let i = index;
                    let even = even;
                    let last = last;
                    trackBy: markUniqueAccount
                "
                class="row-wrapper"
                (mouseenter)="hoverRowNumber = i"
                (mouseleave)="hoverRowNumber = undefined"
                [style.backgroundColor]="getItemBackgroundColor(even)"
                [class.hovered]="hoverRowNumber === i"
                (click)="openAccount(account.fullAddress)"
            >
                <div class="left">
                    <div [style.width.px]="vp.sm ? 88 : 96">
                        <img [src]="getMonkeyUrl(account.fullAddress)" loading="lazy" [height]="72" />
                        <div class="account-number mat-caption" [class.primary]="hoverRowNumber === i">
                            #{{ _util.numberWithCommas(account.index) }}
                        </div>
                    </div>
                    <div class="account-address-container">
                        <div class="mono mat-body-2 address" [class.primary]="hoverRowNumber === i">
                            {{ account.shortAddress }}
                        </div>
                        <div *ngIf="vp.sm">
                            <span class="mat-body-2"> {{ account.formattedBalance }} BAN </span>
                        </div>
                        <div *ngIf="!vp.sm && account.representative" class="mat-body-2">
                            represented by {{ formatRepresentative(account.representative) }}
                        </div>
                    </div>
                </div>
                <div class="right">
                    <ng-container *ngIf="!vp.sm">
                        <ng-template *ngTemplateOutlet="statusBadges; context: { account: this.account }"></ng-template>
                        <ng-container *ngIf="account.representative; else unopenedAccountTag">
                            <span class="mat-body-1"> {{ account.formattedBalance }} BAN </span>
                        </ng-container>
                    </ng-container>
                    <ng-template
                        *ngTemplateOutlet="accountMoreOptions; context: { account: this.account }"
                    ></ng-template>
                </div>
                <mat-divider *ngIf="!last"></mat-divider>
            </div>
        </div>
    `,
})
export class AccountListComponent {
    colors = Colors;
    hoverRowNumber: number;

    @Input() accounts: AccountOverview[] = [];
    @Input() sortDirection: 'none' | 'asc' | 'desc';

    constructor(
        public vp: ViewportService,
        private readonly _router: Router,
        private readonly _util: UtilService,
        private readonly _themeService: ThemeService,
        private readonly _accountService: AccountService,
        private readonly _appStateService: AppStateService
    ) {}

    markUniqueAccount(index: number, item: AccountOverview): any {
        return item.shortAddress;
    }

    showRepresentativeOffline(address: string): boolean {
        return !this._accountService.isRepOnline(address);
    }

    hideAccount(account: AccountOverview): void {
        // Dismiss sheet and then hide account.
        account.moreOptionsOpen = false;
        setTimeout(() => {
            REMOVE_ACCOUNTS_BY_INDEX.next([account.index]);
        }, 100);
    }

    copyAccountAddressMobile(account: AccountOverview): void {
        COPY_ADDRESS_TO_CLIPBOARD.next({ address: account.fullAddress });
    }

    formatRepresentative(rep: string): string {
        return this._appStateService.knownAccounts.get(rep) || this._util.shortenAddress(rep);
    }

    getItemBackgroundColor(even: boolean): string {
        if (even) {
            return this._themeService.isDark() ? this.colors.darkBlack[300] : this.colors.white[100];
        }
        return this._themeService.isDark() ? this.colors.darkBlack[200] : this.colors.white[50];
    }

    openAccount(address: string): void {
        void this._router.navigate([`/account/${address}`]);
    }

    getMonkeyUrl(address: string): string {
        return this._accountService.createMonKeyUrl(address);
    }
}
