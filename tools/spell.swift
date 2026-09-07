// Independent oracle for the composer. Foundation's spell-out formatter is
// ICU's rule-based number format — a completely separate implementation of
// the same three languages, written by people who are not us.
//
// macOS only. That is why the cross-check is its own target and not part of
// `make check`, which has to pass on Linux too.
import Foundation

let f = NumberFormatter()
f.numberStyle = .spellOut

for code in ["zh_CN", "fr_FR", "de_DE", "pt_BR", "es_ES", "it_IT", "ja_JP", "th_TH", "vi_VN"] {
    f.locale = Locale(identifier: code)
    for n in 0...100 {
        print("\(code)\t\(n)\t\(f.string(from: NSNumber(value: n)) ?? "")")
    }
}
