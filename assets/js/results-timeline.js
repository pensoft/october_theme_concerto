/**
 * Results timeline - "What CONCERTO Achieved" (CON-86)
 *
 * Handles the audience toggles that filter the result nodes and the pop-up
 * that opens when a node is clicked. No dependencies.
 */
(function () {
    'use strict';

    var ALL = 'all';

    function ResultsTimeline(root) {
        this.root = root;
        this.toggles = Array.prototype.slice.call(root.querySelectorAll('[data-category]'));
        this.nodes = Array.prototype.slice.call(root.querySelectorAll('[data-result]'));
        this.empty = root.querySelector('.results-timeline__empty');

        this.backdrop = root.querySelector('.results-timeline__dialog-backdrop');
        this.dialog = root.querySelector('.results-timeline__dialog');
        this.dialogTitle = root.querySelector('.results-timeline__dialog-title');
        this.dialogBody = root.querySelector('.results-timeline__dialog-body');
        this.closeButton = root.querySelector('.results-timeline__dialog-close');

        this.selected = [ALL];
        this.lastFocused = null;

        this.bind();
        this.applyFilter();
    }

    ResultsTimeline.prototype.bind = function () {
        var self = this;

        this.toggles.forEach(function (toggle) {
            toggle.addEventListener('click', function () {
                self.onToggle(toggle);
            });
        });

        this.nodes.forEach(function (node) {
            var button = node.querySelector('.results-timeline__node-button');

            if (!button) {
                return;
            }

            button.addEventListener('click', function () {
                self.openDialog(node, button);
            });
        });

        if (this.closeButton) {
            this.closeButton.addEventListener('click', function () {
                self.closeDialog();
            });
        }

        if (this.backdrop) {
            this.backdrop.addEventListener('click', function (event) {
                if (event.target === self.backdrop) {
                    self.closeDialog();
                }
            });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && self.backdrop && !self.backdrop.hidden) {
                self.closeDialog();
            }
        });
    };

    /**
     * "All" is exclusive: picking it clears the rest, and clearing the last
     * audience falls back to it.
     */
    ResultsTimeline.prototype.onToggle = function (toggle) {
        var value = toggle.getAttribute('data-category');

        if (value === ALL) {
            this.selected = [ALL];
        }
        else {
            var index = this.selected.indexOf(value);

            if (index === -1) {
                this.selected = this.selected.filter(function (item) {
                    return item !== ALL;
                });
                this.selected.push(value);
            }
            else {
                this.selected.splice(index, 1);
            }

            if (!this.selected.length) {
                this.selected = [ALL];
            }
        }

        this.syncToggles();
        this.applyFilter();
    };

    ResultsTimeline.prototype.syncToggles = function () {
        var selected = this.selected;

        this.toggles.forEach(function (toggle) {
            var isActive = selected.indexOf(toggle.getAttribute('data-category')) !== -1;

            toggle.classList.toggle('is-active', isActive);
            toggle.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    };

    ResultsTimeline.prototype.applyFilter = function () {
        var showAll = this.selected.indexOf(ALL) !== -1;
        var selected = this.selected;
        var visible = 0;

        this.nodes.forEach(function (node) {
            var categories = (node.getAttribute('data-categories') || '')
                .split(' ')
                .filter(function (id) {
                    return id !== '';
                });

            var isVisible = showAll || categories.some(function (id) {
                return selected.indexOf(id) !== -1;
            });

            node.classList.toggle('is-hidden', !isVisible);

            if (isVisible) {
                visible++;
            }
        });

        if (this.empty) {
            this.empty.hidden = visible !== 0;
        }
    };

    ResultsTimeline.prototype.openDialog = function (node, trigger) {
        if (!this.backdrop) {
            return;
        }

        var details = node.querySelector('.results-timeline__node-details');
        var title = node.querySelector('.results-timeline__node-title');

        this.lastFocused = trigger;
        this.dialogTitle.textContent = title ? title.textContent.trim() : '';
        this.dialogBody.innerHTML = '';

        if (details) {
            this.dialogBody.appendChild(details.content.cloneNode(true));
        }

        this.bindAccordions();

        this.backdrop.hidden = false;

        if (this.closeButton) {
            this.closeButton.focus();
        }
    };

    ResultsTimeline.prototype.bindAccordions = function () {
        var self = this;
        var toggles = this.dialogBody.querySelectorAll('.results-timeline__accordion-toggle');

        Array.prototype.forEach.call(toggles, function (toggle) {
            toggle.addEventListener('click', function () {
                var panel = toggle.nextElementSibling;
                var isOpen = toggle.getAttribute('aria-expanded') === 'true';

                toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');

                if (!panel) {
                    return;
                }

                if (isOpen) {
                    self.collapsePanel(panel);
                }
                else {
                    self.expandPanel(panel);
                }
            });
        });
    };

    /**
     * Animating to "auto" is not possible, so the panel is measured, animated to
     * that pixel height and then released back to "auto" once it settles - that
     * way it still reflows if the dialog is resized while open.
     */
    ResultsTimeline.prototype.expandPanel = function (panel) {
        clearTransition(panel);

        panel.hidden = false;
        panel.style.height = '0px';

        reflow(panel);

        panel.style.height = panel.scrollHeight + 'px';

        onTransitionEnd(panel, function () {
            panel.style.height = 'auto';
        });
    };

    ResultsTimeline.prototype.collapsePanel = function (panel) {
        clearTransition(panel);

        // From "auto" there is nothing to animate from, so pin the current height first.
        panel.style.height = panel.scrollHeight + 'px';

        reflow(panel);

        panel.style.height = '0px';

        onTransitionEnd(panel, function () {
            panel.hidden = true;
            panel.style.height = '';
        });
    };

    function reflow(element) {
        // Reading the value forces the pending style change to be applied, so the
        // browser animates instead of jumping straight to the new height.
        return element.offsetHeight;
    }

    /**
     * Keeps one pending listener per panel, so clicking faster than the
     * animation cannot leave a stale callback behind.
     */
    function onTransitionEnd(panel, callback) {
        // No transition (reduced motion, or the stylesheet has not loaded) means
        // transitionend never fires, so settle straight away.
        if (!hasTransition(panel)) {
            callback();
            return;
        }

        var handler = function (event) {
            if (event.target !== panel || event.propertyName !== 'height') {
                return;
            }

            clearTransition(panel);
            callback();
        };

        panel.rtTransitionHandler = handler;
        panel.addEventListener('transitionend', handler);
    }

    function hasTransition(panel) {
        if (!window.getComputedStyle) {
            return false;
        }

        var duration = window.getComputedStyle(panel).transitionDuration;

        if (!duration) {
            return false;
        }

        return duration.split(',').some(function (value) {
            return parseFloat(value) > 0;
        });
    }

    function clearTransition(panel) {
        if (panel.rtTransitionHandler) {
            panel.removeEventListener('transitionend', panel.rtTransitionHandler);
            panel.rtTransitionHandler = null;
        }
    }

    ResultsTimeline.prototype.closeDialog = function () {
        if (!this.backdrop) {
            return;
        }

        this.backdrop.hidden = true;
        this.dialogBody.innerHTML = '';

        if (this.lastFocused) {
            this.lastFocused.focus();
            this.lastFocused = null;
        }
    };

    function init() {
        var roots = document.querySelectorAll('[data-control="results-timeline"]');

        Array.prototype.forEach.call(roots, function (root) {
            if (!root.resultsTimeline) {
                root.resultsTimeline = new ResultsTimeline(root);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
})();
