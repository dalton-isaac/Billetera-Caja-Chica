import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
  if (typeof HTMLAnchorElement !== 'undefined' && !HTMLAnchorElement.prototype.click) {
    HTMLAnchorElement.prototype.click = () => {};
  }
}

