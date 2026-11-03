# Build the app: index.html (page source + its data + app head) and sw.js (with a new version so phones pick up the update).
# Run from anywhere:  python3 src/build.py
# For the end-to-end tests, write the plain page instead (no app head):  python3 src/build.py --plain OUT_DIR/vocab-trainer.html
import json, hashlib, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, 'src')


def read(*p):
    with open(os.path.join(S, *p), encoding='utf-8') as f:
        return f.read()


def p4():
    # the phase 4 lessons in one object: sounds, role-play dialogues, find-the-error drills, writing tasks
    d = {k: json.loads(read('data', k + '.json')) for k in ('sounds', 'talk', 'drills', 'write')}
    return json.dumps(d, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def page():
    html = read('trainer.src.html')
    vocab = read('data', 'vocab.js')
    ncat = len(json.loads(vocab))
    audio = json.loads(read('data', 'audio-index.json'))
    assert len(audio['w']) == ncat and len(audio['s']) == ncat, 'audio index does not match the topics'
    parts = [
        ('/*__DATA__*/[]', vocab),
        ('/*__AUDIO__*/null', json.dumps(audio, separators=(',', ':'))),
        ('/*__GRAM__*/null', read('data', 'gram.json').replace('</', '<\\/')),
        ('/*__READ__*/null', read('data', 'read.json').replace('</', '<\\/')),
        ('/*__P4__*/null', p4()),
    ]
    for marker, text in parts:
        assert html.count(marker) == 1, 'marker missing: ' + marker
        html = html.replace(marker, text)
    return html


def app(html):
    i = html.index('</style>') + len('</style>')
    head, body = html[:i], html[i:]
    return ('<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">\n'
            '<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">\n'
            '<meta name="robots" content="noindex">\n'
            '<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="icon" type="image/png" href="icons/icon-192.png">\n'
            '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n'
            + head + '\n</head>\n<body>\n' + body +
            "\n<script>if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });</script>\n"
            '</body>\n</html>\n')


if __name__ == '__main__':
    html = page()
    if len(sys.argv) > 2 and sys.argv[1] == '--plain':
        os.makedirs(os.path.dirname(os.path.abspath(sys.argv[2])), exist_ok=True)
        with open(sys.argv[2], 'w', encoding='utf-8') as f:
            f.write(html)
        print('plain page', sys.argv[2], len(html.encode('utf-8')), 'bytes')
        sys.exit(0)
    out = app(html)
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(out)
    version = hashlib.sha1(out.encode('utf-8')).hexdigest()[:10]
    with open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(read('sw.template.js').replace('__VERSION__', version))
    # every sound file the page refers to must be in audio/
    audio = json.loads(read('data', 'audio-index.json'))
    missing = [s for k in audio['f'] for s in audio['f'][k] if not os.path.exists(os.path.join(ROOT, 'audio', s + '.mp3'))]
    assert not missing, 'sound files missing: ' + ', '.join(missing)
    print('index.html', len(out.encode('utf-8')), 'bytes, sw version', version)
