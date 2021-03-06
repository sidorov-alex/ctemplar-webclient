import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as parseEmail from 'email-addresses';

import { Mailbox } from '../models';
import {
  AppState,
  AutocryptEncryptDetermine,
  AutocryptEncryptDetermineForSingle,
  AutocryptPreferEncryptType,
  Contact,
  ContactsState,
  Draft,
  GlobalPublicKey,
  MailBoxesState,
  UIRecommendationValue,
} from '../datatypes';

import { SharedService } from './shared.service';

@Injectable()
export class AutocryptProcessService {
  private mailboxes: Mailbox[] = [];

  private contacts: Contact[] = [];

  constructor(private store: Store<AppState>, private sharedService: SharedService) {
    this.store
      .select(state => state.mailboxes)
      .subscribe((mailBoxesState: MailBoxesState) => {
        this.mailboxes = mailBoxesState.mailboxes;
      });
    this.store
      .select(state => state.contacts)
      .subscribe((contactsState: ContactsState) => {
        this.contacts = contactsState.contacts;
      });
  }

  decideAutocryptDefaultEncryptionWithDraft(
    draftMail: Draft,
    usersKeys: Map<string, GlobalPublicKey>,
  ): AutocryptEncryptDetermine {
    if (draftMail.draft) {
      const senderMailbox: Mailbox = this.mailboxes.find(mailbox => draftMail.draft.mailbox === mailbox.id);
      const receivers: string[] = [
        ...draftMail.draft.receiver.map(
          receiver => (parseEmail.parseOneAddress(receiver) as parseEmail.ParsedMailbox).address,
        ),
        ...draftMail.draft.cc.map(cc => (parseEmail.parseOneAddress(cc) as parseEmail.ParsedMailbox).address),
        ...draftMail.draft.bcc.map(bcc => (parseEmail.parseOneAddress(bcc) as parseEmail.ParsedMailbox).address),
      ];
      return this.decideAutocryptDefaultEncryption(senderMailbox, receivers, usersKeys);
    }
    return {
      encryptTotally: false,
      senderAutocryptEnabled: false,
      senderPreferEncrypt: AutocryptPreferEncryptType.NOPREFERENCE,
      recommendationValue: UIRecommendationValue.DISABLE,
    };
  }

  /**
   * Lanuch Autocrypt Default Encryption checking based on
   * https://autocrypt.org/level1.html#provide-a-recommendation-for-message-encryption
   * @param draftMail
   * @param usersKeys
   */
  decideAutocryptDefaultEncryption(
    senderMailbox: Mailbox,
    receivers: string[],
    usersKeys: Map<string, GlobalPublicKey>,
  ): AutocryptEncryptDetermine {
    // Check sender mailbox is enabled for Autocrypt
    if (!senderMailbox.is_autocrypt_enabled) {
      return {
        encryptTotally: false,
        senderAutocryptEnabled: false,
        senderPreferEncrypt: AutocryptPreferEncryptType.NOPREFERENCE,
        recommendationValue: UIRecommendationValue.DISABLE,
      };
    }
    if (!receivers || receivers.length === 0) {
      return {
        encryptTotally: senderMailbox.prefer_encrypt === 'mutual',
        senderAutocryptEnabled: true,
        senderPreferEncrypt:
          senderMailbox.prefer_encrypt === 'mutual'
            ? AutocryptPreferEncryptType.MUTUAL
            : AutocryptPreferEncryptType.NOPREFERENCE,
        recommendationValue: UIRecommendationValue.AVAILABLE,
      };
    }
    const receiversStatus = new Map<string, AutocryptEncryptDetermineForSingle>();

    for (const receiver of receivers) {
      const parsedEmail = parseEmail.parseOneAddress(receiver) as parseEmail.ParsedMailbox;
      if (!parsedEmail) {
        receiversStatus.set(receiver, {
          recommendationValue: UIRecommendationValue.DISABLE,
          encrypt: false,
        });
      } else {
        const contact = this.contacts.find(everyContact => everyContact.email === parsedEmail.address);
        if (!contact) {
          receiversStatus.set(parsedEmail.address, {
            recommendationValue: UIRecommendationValue.DISABLE,
            encrypt: false,
          });
        } else {
          const keyInfo = this.sharedService.parseUserKey(usersKeys, receiver);
          if (keyInfo.isCTemplarKey) {
            receiversStatus.set(contact.email, {
              recommendationValue: UIRecommendationValue.CTEMPLAR,
              encrypt: false,
            });
          } else if (keyInfo.isExistKey) {
            // Completed checking STEP 1 (Determine if encryption is possible),
            // the result is OK, will jump into the next process
            // https://autocrypt.org/level1.html#determine-if-encryption-is-possible
            const processResult = this.launchProcessForCheckAutocryptPossible(senderMailbox, contact);
            receiversStatus.set(contact.email, processResult);
          } else {
            receiversStatus.set(contact.email, {
              recommendationValue: UIRecommendationValue.DISABLE,
              encrypt: false,
            });
          }
        }
      }
    }
    const encryptTotally = [...receiversStatus.keys()].every(key => receiversStatus.get(key).encrypt);
    let recommendationValue = UIRecommendationValue.DISABLE;
    if (encryptTotally) {
      const isCourage = [...receiversStatus.keys()].every(
        key =>
          receiversStatus.get(key).recommendationValue === UIRecommendationValue.ENCRYPT ||
          receiversStatus.get(key).recommendationValue === UIRecommendationValue.AVAILABLE,
      );
      recommendationValue = isCourage ? UIRecommendationValue.ENCRYPT : UIRecommendationValue.DISCOURAGE;
    }
    return {
      encryptTotally,
      recommendationValue,
      senderPreferEncrypt:
        senderMailbox.prefer_encrypt === 'mutual'
          ? AutocryptPreferEncryptType.MUTUAL
          : AutocryptPreferEncryptType.NOPREFERENCE,
      senderAutocryptEnabled: true,
      receiversStatus,
    };
  }

  private launchProcessForCheckAutocryptPossible(senderMailbox: Mailbox, contact: Contact): any {
    // STEP 2
    // Checking Preliminary Recommendation
    // https://autocrypt.org/level1.html#preliminary-recommendation

    // If autocrypt_timestamp is more than 35 days older than last_seen, set preliminary-recommendation to discourage.
    // Otherwise, set preliminary-recommendation to available.
    let recommendationValue = UIRecommendationValue.AVAILABLE;
    const MAX_DISCOURAGE_DAY = 35;
    const autocryptTimestamp: Date = new Date(contact.autocrypt_timestamp);
    const lastSeen: Date = new Date(contact.last_seen);
    if (!contact.last_seen && this.dateDiffInDays(autocryptTimestamp, lastSeen) >= MAX_DISCOURAGE_DAY) {
      recommendationValue = UIRecommendationValue.DISCOURAGE;
    }

    // STEP 3
    // Checking whether decide encrypt by default
    // https://autocrypt.org/level1.html#deciding-to-encrypt-by-default

    // If preliminary-recommendation is either available or discourage,
    // and the message is composed as a reply to an encrypted message, or
    // TODO - Skipping now for above condition
    let encrypt = false;
    // If the preliminary-recommendation is available and
    // both peers[to-addr].prefer_encrypt and accounts[from-addr].prefer_encrypt are mutual.
    if (
      senderMailbox.is_autocrypt_enabled &&
      senderMailbox.prefer_encrypt === AutocryptPreferEncryptType.MUTUAL &&
      contact.prefer_encrypt === AutocryptPreferEncryptType.MUTUAL
    ) {
      encrypt = true;
    }
    return {
      recommendationValue,
      encrypt,
    };
  }

  dateDiffInDays(start: Date, end: Date) {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const utc2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((utc2 - utc1) / MS_PER_DAY);
  }
}
