import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as Colors from '@brightlayer-ui/colors';
import { FormControl } from '@angular/forms';
import { TransactionService } from '@app/services/transaction.service';
import { AccountService } from '@app/services/account.service';
import { SpyglassService } from '@app/services/spyglass.service';
import { UtilService } from '@app/services/util.service';
import { TRANSACTION_COMPLETED_SUCCESS } from '@app/services/wallet-events.service';

export type RepScore = {
    address: string;
    alias?: string;
    online: boolean;
    principal: boolean;
    score: number;
    weightPercentage: number;
};

export type ChangeRepOverlayData = {
    address: string;
    index: number;
    currentRep: string;
};

@Component({
    selector: 'app-change-rep-overlay',
    styleUrls: ['change-rep.component.scss'],
    template: `
        <div class="change-rep-overlay">
            <div
                    *ngIf="hasSuccess === true"
                    mat-dialog-content
                    style="display: flex; justify-content: center; flex:  1 1 0px; padding-bottom: 16px;"
            >
                <app-empty-state>
                    <mat-icon blui-empty-icon> check_circle</mat-icon>
                    <div blui-title>Representative Changed</div>
                    <div blui-description>
                        Your representative has been successfully updated and can be viewed
                        <span class="link" [style.color]="colors.blue[500]" (click)="openLink()">here.</span>
                        You can now close this window.
                    </div>
                    <div blui-actions>
                        <button
                                mat-flat-button
                                color="primary"
                                class="close-button"
                                (click)="closeOverlay()"
                                data-cy="change-close-completed-button"
                        >
                            Close
                        </button>
                    </div>
                </app-empty-state>
            </div>

            <div
                    *ngIf="hasSuccess === false"
                    mat-dialog-content
                    class="overlay-body"
                    style="display: flex; justify-content: center; flex:  1 1 0px; padding-bottom: 16px;"
            >
                <app-empty-state>
                    <mat-icon blui-empty-icon> error</mat-icon>
                    <div blui-title>Representative Change Failed</div>
                    <div blui-description>Your representative could not be changed.</div>
                    <div blui-actions>
                        <button
                                mat-flat-button
                                color="primary"
                                class="close-button"
                                (click)="closeOverlay()"
                                data-cy="change-close-fail-button"
                        >
                            Close
                        </button>
                    </div>
                </app-empty-state>
            </div>

            <ng-container *ngIf="hasSuccess === undefined">
                <h1 mat-dialog-title>Change Representative</h1>
                <div mat-dialog-content style="margin-bottom: 32px;">
                    <ng-container *ngIf="activeStep === 0">
                        <div>Your current representative is:</div>
                        <div
                                class="mono"
                                style="word-break: break-all"
                                [innerHTML]="util.formatHtmlAddress(data.currentRep)"
                        ></div>
                        <div class="first-page-rep-metadata">
                            <ng-container
                                    *ngTemplateOutlet="metadata; context: { metadata: currentRepresentativeMetaData }"
                            >
                            </ng-container>
                        </div>
                    </ng-container>

                    <ng-container *ngIf="activeStep === 1">
                        <div style="margin-bottom: 16px">Please enter the new representative address.</div>

                        <mat-slide-toggle *ngIf="repScores" [(ngModel)]="selectFromList" style="margin-bottom: 24px;">
                            Choose from List
                        </mat-slide-toggle>

                        <mat-form-field appearance="fill" style="width: 100%" *ngIf="selectFromList">
                            <mat-label>Representative</mat-label>
                            <mat-select [formControl]="representativesListForm">
                                <mat-option *ngFor="let rep of getRepsWithMinScore(75)" [value]="rep.address">
                                    <div style="display: flex; justify-content: space-between">
                                        <div style="text-overflow: ellipsis; overflow:hidden">
                                            {{ rep.alias || util.shortenAddress(rep.address) }}
                                        </div>
                                        <div>
                                            <strong style="margin-left: 8px">{{ rep.score }}</strong>
                                            /100
                                        </div>
                                    </div>
                                </mat-option>
                            </mat-select>
                        </mat-form-field>

                        <mat-form-field style="width: 100%;" appearance="fill" *ngIf="!selectFromList">
                            <mat-label>Representative Address</mat-label>
                            <input matInput type="value" [(ngModel)]="manualEnteredNewRepresentative"/>
                        </mat-form-field>
                    </ng-container>

                    <ng-container *ngIf="activeStep === 2">
                        <div style="margin-bottom: 24px">Please confirm the transaction details below:</div>
                        <div style="font-weight: 600">Change Rep To</div>
                        <div
                                style="word-break: break-all; font-family: monospace"
                                [innerHTML]="util.formatHtmlAddress(getUseSelectedRepresentative())"
                        ></div>
                        <ng-container *ngTemplateOutlet="metadata; context: { metadata: newRepresentativeMetaData }">
                        </ng-container>
                    </ng-container>
                </div>
                <blui-spacer></blui-spacer>
                <mat-divider style="margin-left: -48px; margin-right: -48px"></mat-divider>
                <blui-mobile-stepper [activeStep]="activeStep" [steps]="maxSteps">
                    <button
                            mat-stroked-button
                            blui-back-button
                            color="primary"
                            (click)="back()"
                            data-cy="change-close-button"
                    >
                        <ng-container *ngIf="activeStep === 0">Close</ng-container>
                        <ng-container *ngIf="activeStep > 0">Back</ng-container>
                    </button>
                    <button
                            class="loading-button"
                            mat-flat-button
                            blui-next-button
                            color="primary"
                            (click)="next()"
                            [disabled]="!canContinue()"
                    >
                        <ng-container *ngIf="activeStep < lastStep">Next</ng-container>
                        <ng-container *ngIf="activeStep === lastStep">
                            <div class="spinner-container" [class.isLoading]="isChangingRepresentative">
                                <mat-spinner class="primary-spinner" diameter="20"></mat-spinner>
                            </div>
                            <span *ngIf="!isChangingRepresentative"> Change </span>
                        </ng-container>
                    </button>
                </blui-mobile-stepper>
            </ng-container>
        </div>

        <ng-template #metadata let-metadata="metadata">
            <ng-container *ngIf="metadata">
                <ng-container *ngIf="metadata.alias">
                    <div style="font-weight: 600; margin-top: 24px">Alias</div>
                    <div>{{ metadata.alias }}</div>
                </ng-container>
                <ng-container *ngIf="metadata.score">
                    <div style="font-weight: 600; margin-top: 24px">Score</div>
                    <div style="display: flex; align-items: center">
                        <strong>{{ metadata.score }}</strong
                        >/100
                        <blui-list-item-tag
                                *ngIf="metadata.score > 80"
                                [label]="metadata.score < 90 ? 'Good' : 'Excellent'"
                                [backgroundColor]="colors.green[500]"
                                [fontColor]="colors.black[900]"
                                style="margin-left: 16px"
                        >
                        </blui-list-item-tag>
                        <blui-list-item-tag
                                *ngIf="metadata.score < 60"
                                [label]="'Not Recommended'"
                                [backgroundColor]="colors.red[500]"
                                style="margin-left: 16px"
                        >
                        </blui-list-item-tag>
                    </div>
                </ng-container>
            </ng-container>
        </ng-template>
    `,
})
export class ChangeRepComponent implements OnInit {
    @Input() data: ChangeRepOverlayData;
    @Output() closeWithHash: EventEmitter<string> = new EventEmitter<string>();

    activeStep = 0;
    maxSteps = 3;
    lastStep = this.maxSteps - 1;

    txHash: string;
    manualEnteredNewRepresentative: string;

    isChangingRepresentative: boolean;
    hasSuccess: boolean;
    selectFromList: boolean;

    colors = Colors;
    repScores: RepScore[] = [];
    representativesListForm = new FormControl();
    currentRepresentativeMetaData: RepScore;
    newRepresentativeMetaData: RepScore;

    constructor(
        public util: UtilService,
        private readonly _apiService: SpyglassService,
        private readonly _transactionService: TransactionService,
        private readonly _accountService: AccountService
    ) {}

    ngOnInit(): void {
        this._apiService
            .getRepresentativeScores()
            .then((data) => {
                this.repScores = data;
                this.selectFromList = true;
                this.repScores.map((rep) => {
                    if (rep.address === this.data.currentRep) {
                        this.currentRepresentativeMetaData = rep;
                    }
                });
            })
            .catch((err) => {
                console.error(err);
            });
    }
    back(): void {
        if (this.activeStep === 0) {
            return this.closeOverlay();
        }
        this.activeStep--;
    }

    next(): void {
        if (this.activeStep === this.lastStep) {
            return this.changeRepresentative();
        }
        if (this.activeStep === 1) {
            this.newRepresentativeMetaData = undefined;
            this.repScores.map((rep) => {
                if (rep.address === this.getUseSelectedRepresentative()) {
                    this.newRepresentativeMetaData = rep;
                }
            });
        }
        this.activeStep++;
    }

    canContinue(): boolean {
        if (this.activeStep === 1) {
            return this.util.isValidAddress(this.getUseSelectedRepresentative());
        }
        return true;
    }

    openLink(): void {
        this._accountService.showBlockInExplorer(this.txHash);
    }

    closeOverlay(): void {
        this.closeWithHash.emit(this.txHash);
    }

    getRepsWithMinScore(minScore: number): RepScore[] {
        const reps = [];
        this.repScores.map((rep) => {
            if (rep.score > minScore) {
                reps.push(rep);
            }
        });
        return reps;
    }

    getUseSelectedRepresentative(): string {
        if (this.selectFromList) {
            return this.representativesListForm.value;
        }
        return this.manualEnteredNewRepresentative;
    }

    changeRepresentative(): void {
        if (this.isChangingRepresentative) {
            return;
        }

        this.isChangingRepresentative = true;
        this._transactionService
            .changeRepresentative(this.getUseSelectedRepresentative(), this.data.address, this.data.index)
            .then((hash) => {
                this.txHash = hash;
                this.hasSuccess = true;
                this.isChangingRepresentative = false;
                TRANSACTION_COMPLETED_SUCCESS.next(hash);
            })
            .catch((err) => {
                console.error(err);
                this.hasSuccess = false;
                this.isChangingRepresentative = false;
            });
    }
}
