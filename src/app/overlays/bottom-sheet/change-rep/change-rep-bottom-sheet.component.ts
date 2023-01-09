import { Component, Inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { ChangeRepOverlayData } from '@app/overlays/actions/change-rep/change-rep.component';

@Component({
    selector: 'app-change-rep-bottom-sheet',
    template: ` <app-change-rep-overlay [data]="data" (closeWithHash)="closeSheet($event)"></app-change-rep-overlay> `,
})
export class ChangeRepBottomSheetComponent {
    constructor(
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: ChangeRepOverlayData,
        private readonly _sheet: MatBottomSheetRef<ChangeRepBottomSheetComponent>
    ) {}

    closeSheet(hash: string): void {
        this._sheet.dismiss(hash);
    }
}
