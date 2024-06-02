import LinkBlot from 'quill/formats/link.js';

class CustomLinkBlot extends LinkBlot {
  static create(value: string) {
    const node = super.create(value) as HTMLElement;
    node.setAttribute('href', this.sanitize(value));
    node.setAttribute('rel', 'noopener noreferrer');
    // node.setAttribute('target', '_blank');
    // Target _self prevents Tauri from opening on click for some reason (and we want this)
    node.setAttribute('target', '_self');
    return node;
  }

  static sanitize(url: string) {
    const protocol = url.slice(0, url.indexOf(':'));
    const hasValidProtocol = LinkBlot.PROTOCOL_WHITELIST.includes(protocol);
    if (!hasValidProtocol) {
      return 'https://' + url;
    }
    return url;
  }
}

export default CustomLinkBlot;