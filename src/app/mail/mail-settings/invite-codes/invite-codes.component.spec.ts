import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { InviteCodesComponent } from './invite-codes.component';

describe('InviteCodesComponent', () => {
  let component: InviteCodesComponent;
  let fixture: ComponentFixture<InviteCodesComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [InviteCodesComponent],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(InviteCodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
