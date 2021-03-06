import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BrowserDetectorService {
  isIEBrowser() {
    return !!this.checkIEVersion();
  }

  private checkIEVersion() {
    // Ref: https://stackoverflow.com/a/46116505/3502008
    const ua = window.navigator.userAgent;

    const msie = ua.indexOf('MSIE ');
    if (msie > 0) {
      // IE 10 or older => return version number
      // eslint-disable-next-line unicorn/prefer-string-slice
      return Number.parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    const trident = ua.indexOf('Trident/');
    if (trident > 0) {
      // IE 11 => return version number
      const rv = ua.indexOf('rv:');
      // eslint-disable-next-line unicorn/prefer-string-slice
      return Number.parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    // other browser
    return false;
  }
}
