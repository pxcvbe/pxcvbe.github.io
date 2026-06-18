/* Terminal-Grid Navigation — DESIGN.md §4 (decode) + §6 (theme).
   Vanilla implementation; no framework. */
(function () {
    'use strict';

    /* ── §4  Character-scramble decode ─────────────────────────── */
    var GLYPHS = '!@#$%^&*+=<>?/|\\:;.,"~`abcdefghijklmnopqrstuvwxyz0123456789';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var lockEveryMs = 75;   // a new char locks every 75ms
    var tickEveryMs = 45;   // the rest re-randomize every 45ms
    var tailMs      = 180;  // caret-only flash after the last lock

    function glyphAt(tick, i) {
        var n = GLYPHS.length;
        var idx = (tick * (7 + i) + 13 * i + (tick ^ i)) % n;
        if (idx < 0) idx += n;
        return GLYPHS.charAt(idx);
    }

    function setupDecode(link) {
        var target = link.getAttribute('data-decode') || '';
        var textEl = link.querySelector('.label-text');
        if (!textEl) return;

        var timer = null, start = 0, tick = 0;

        function render(locked) {
            var out = '';
            for (var i = 0; i < target.length; i++) {
                out += i < locked ? target.charAt(i) : glyphAt(tick, i);
            }
            textEl.textContent = out;
        }

        function step() {
            tick++;
            var elapsed = performance.now() - start;
            var locked = Math.min(Math.floor(elapsed / lockEveryMs), target.length);
            render(locked);
            if (elapsed >= target.length * lockEveryMs + tailMs) {
                textEl.textContent = target;   // resolved; caret stays via :hover
                timer = null;
                return;
            }
            timer = setTimeout(step, tickEveryMs);
        }

        function begin() {
            link.classList.add('decoding');
            if (reduce) { textEl.textContent = target; return; }
            if (timer) clearTimeout(timer);
            start = performance.now();
            tick = 0;
            step();
        }

        function end() {
            if (timer) { clearTimeout(timer); timer = null; }
            link.classList.remove('decoding');
            textEl.textContent = target;       // snap back to resolved word
        }

        link.addEventListener('mouseenter', begin);
        link.addEventListener('mouseleave', end);
        link.addEventListener('focus', begin);
        link.addEventListener('blur', end);
    }

    /* ── §6  Theme toggle ──────────────────────────────────────── */
    var KEY = 'terminalNav.theme';

    function setTheme(mode) {
        document.documentElement.setAttribute('data-theme', mode);
        try { localStorage.setItem(KEY, mode); } catch (e) {}
        var next = mode === 'dark' ? 'light' : 'dark';
        var label = 'Switch to ' + next + ' mode';
        var btns = document.querySelectorAll('.switch');
        for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-label', label);
    }

    function init() {
        var links = document.querySelectorAll('.cell-link[data-decode]');
        for (var i = 0; i < links.length; i++) setupDecode(links[i]);

        var current = document.documentElement.getAttribute('data-theme') || 'dark';
        setTheme(current);  // normalize attribute + sync aria-labels

        var btns = document.querySelectorAll('.switch');
        for (var j = 0; j < btns.length; j++) {
            btns[j].addEventListener('click', function () {
                var cur = document.documentElement.getAttribute('data-theme');
                setTheme(cur === 'dark' ? 'light' : 'dark');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
