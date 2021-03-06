import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MailDetailEncryptionTypeIconComponent } from './mail-detail-encryption-type-icon.component';

describe('MailDetailEncryptionTypeIconComponent', () => {
  let component: MailDetailEncryptionTypeIconComponent;
  let fixture: ComponentFixture<MailDetailEncryptionTypeIconComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [MailDetailEncryptionTypeIconComponent],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(MailDetailEncryptionTypeIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
