// ==UserScript==
// @name         Baidu Search: Remove AI Modules
// @namespace    http://tampermonkey.net/
// @version      2.3-safe
// @description  Remove result containers containing "文心智能体". Keep normal results, ignore "AI生成" keyword.
// @author       anonymous
// @match        *://www.baidu.com/s*
// @match        *://baidu.com/s*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    /**
     * Remove AI blocks via predefined css selectors
     */
    function removeBySelectors() {
        const selectors = [
            'div[tpl="ai_index"]',
            'div[tpl="wenda_generate"]',
            'div[data-tpl="ai_index"]',
            'div[data-tpl="wenda_generate"]',
            '[class*="ai-index"]',
            '[class*="wenda-generate"]',
            '[class*="ai-agent"]',
            '[class*="agent-card"]',
            '[class*="ai-summary"]',
            '[class*="ai-answer"]',
            '[class*="ai-agent-container"]',
            '[class*="agent-result"]',
            '._content-border_zc167_4.cu-border.sc-aladdin.sc-cover-card',
            '._swiper-container_1ktf7_2.wd-ai-index-pc.swiper-box_33dz'
        ];
        let removed = 0;
        for (const sel of selectors) {
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
                el.remove();
                removed++;
            }
        }
        if (removed > 0) console.log(`[RemoveAI] Selector purge removed ${removed} element(s).`);
        return removed;
    }

    /**
     * Delete entire card if text contains "文心智能体" only
     * Will NOT trigger by "AI生成" to prevent mis‑deletion
     */
    function removeWenxinAgentCards() {
        const containers = document.querySelectorAll('.result-op, .c-container, .result, .result-item');
        let removed = 0;
        for (const container of containers) {
            if (container.innerText.includes('文心智能体')) {
                container.remove();
                removed++;
            }
        }
        if (removed > 0) console.log(`[RemoveAI] Wenxin‑Agent purge removed ${removed} container(s).`);
        return removed;
    }

    /**
     * Run full cleanup procedure
     */
    function cleanAll() {
        let total = 0;
        total += removeBySelectors();
        total += removeWenxinAgentCards();
        if (total > 0) {
            console.log(`[RemoveAI] Total removed: ${total}.`);
        }
        return total;
    }

    // First run on script inject
    cleanAll();

    // Observe dynamic dom changes, debounce 300ms
    let timer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => cleanAll(), 300);
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Manual hotkey: Ctrl + Shift + R
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
            e.preventDefault();
            cleanAll();
            console.log('[RemoveAI] Manual sweep complete.');
        }
    });

    // Extra delayed cleanup after page full loaded
    window.addEventListener('load', () => setTimeout(cleanAll, 500));

    console.log('[RemoveAI] Active. Shortcut: Ctrl+Shift+R');
})();
