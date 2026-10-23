import { installDialogStub } from './dialog'

installDialogStub()

// Radix Select calls these, which jsdom lacks (node-environment files have no Element).
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}
