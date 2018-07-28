import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbModal, NgbDropdownConfig, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AppState, MailBoxesState, Settings, UserState, MailState } from '../../store/datatypes';
import { Store } from '@ngrx/store';
import { OnDestroy, TakeUntilDestroy } from 'ngx-take-until-destroy';
import { Observable } from 'rxjs/Observable';
import { CreateFolderComponent } from '../dialogs/create-folder/create-folder.component';
import { MailFolderType, Mail } from '../../store/models/mail.model';
import { MoveMail, UpdateFolder } from '../../store/actions/mail.actions';

@TakeUntilDestroy()
@Component({
  selector: 'app-mail-sidebar',
  templateUrl: './mail-sidebar.component.html',
  styleUrls: ['./mail-sidebar.component.scss']
})
export class MailSidebarComponent implements OnInit, OnDestroy {

  LIMIT = 2;

  readonly destroyed$: Observable<boolean>;

  // Public property of boolean type set false by default
  public isComposeVisible: boolean = false;
  public settings: Settings;
  @ViewChild('confirmationModal') confirmationModal;
  private confirmModalRef: NgbModalRef;

  mailBoxesState: MailBoxesState;
  mailState: MailState;
  selectedFolder: MailFolderType;

  draftCount: number = 0;
  inboxUnreadCount: number = 0;

  constructor(private store: Store<AppState>,
              private modalService: NgbModal,
              config: NgbDropdownConfig
  ) {
    // customize default values of dropdowns used by this component tree
    config.autoClose = 'outside';
  }

  ngOnInit() {
    this.store.select(state => state.user).takeUntil(this.destroyed$)
      .subscribe((user: UserState) => {
        this.settings = user.settings;
      });

    this.store.select(state => state.mailboxes).takeUntil(this.destroyed$)
      .subscribe((mailboxes: MailBoxesState) => {
        this.mailBoxesState = mailboxes;
      });

    this.store.select(state => state.mail).takeUntil(this.destroyed$)
    .subscribe((mailState: MailState) => {

      this.mailState = mailState;

      // Draft items count
      const drafts = mailState.folders.get(MailFolderType.DRAFT);
      if (drafts) {
        this.draftCount = drafts.length;
      }

      // Inbox unread items count
      const inbox = mailState.folders.get(MailFolderType.INBOX);
      if (inbox) {
        this.inboxUnreadCount = inbox.filter((mail: Mail) => !mail.read).length;
      }

    });
  }

  // == Open NgbModal
  open() {
    this.modalService.open(CreateFolderComponent, { centered: true, windowClass: 'modal-sm mailbox-modal' });
  }


  // == Show mail compose modal
  // == Setup click event to toggle mobile menu
  showMailComposeModal() { // click handler
    this.isComposeVisible = true;
  }

  showConfirmationModal(folder) {
    this.confirmModalRef = this.modalService.open(this.confirmationModal, {
      centered: true,
      windowClass: 'modal-sm users-action-modal'
    });
    this.selectedFolder = folder;
  }

  toggleDisplayLimit(totalItems) {
    if (this.LIMIT === totalItems) {
      this.LIMIT = 2;
    } else {
      this.LIMIT = totalItems;
    }
  }

  deleteFolder() {
    const folderMails: Mail[] = this.mailState.folders.get(this.selectedFolder);
    const ids = folderMails.map(mail => mail.id).join(',');
    if (ids) {
      this.mailBoxesState.mailboxes[0].folders = this.mailBoxesState.mailboxes[0].folders.filter(folder => folder !== this.selectedFolder);
      this.store.dispatch(new MoveMail({
        ids: ids,
        folder: MailFolderType.TRASH,
        shouldDeleteFolder: true,
        mailbox: this.mailBoxesState.mailboxes[0]
      }));
      this.confirmModalRef.dismiss();
    } else {
      this.mailBoxesState.mailboxes[0].folders = this.mailBoxesState.mailboxes[0].folders.filter(folder => folder !== this.selectedFolder);
      this.store.dispatch(new UpdateFolder(this.mailBoxesState.mailboxes[0]));
    }
  }

  ngOnDestroy(): void {
  }

}
