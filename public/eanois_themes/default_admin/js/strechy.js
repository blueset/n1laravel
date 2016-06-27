/*
 * Stretchy: Form element autosizing, the way it should be.
 * by Lea Verou http://lea.verou.me
 * MIT license
 */
(function () {

    if (!self.Element) {
        return; // super old browser
    }

    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector || null;
    }

    if (!Element.prototype.matches) {
        return;
    }

    function $$(expr, con) {
        return expr instanceof Node || expr instanceof Window ? [expr] :
            [].slice.call(typeof expr == "string" ? (con || document).querySelectorAll(expr) : expr || []);
    }

    var _ = self.Stretchy = {
        selectors: {
            base: 'textarea, select:not([size]), input:not([type]), input[type="' + "text url number email tel".split(" ").join('"], input[type="') + '"]',
            filter: "*"
        },

        // Script element this was included with, if any
        script: document.currentScript || $$("script").pop(),

        // Autosize one element. The core of Stretchy.
        resize: function (element) {
            if (!_.resizes(element)) {
                return;
            }

            var cs = getComputedStyle(element);
            var offset = 0;

            if (!element.value && element.placeholder) {
                var empty = true;
                element.value = element.placeholder;
            }

            var type = element.nodeName.toLowerCase();

            if (type == "textarea") {
                element.style.height = "0";

                if (cs.boxSizing == "border-box") {
                    offset = element.offsetHeight;
                }
                else if (cs.boxSizing == "content-box") {
                    offset = -element.clientHeight;
                }

                element.style.height = element.scrollHeight + offset + "px";
            }
            else if (type == "input") {
                element.style.width = "0";

                if (cs.boxSizing == "border-box") {
                    offset = element.offsetWidth;
                }
                else if (cs.boxSizing == "padding-box") {
                    offset = element.clientWidth;
                }

                // Safari misreports scrollWidth, so we will instead set scrollLeft to a
                // huge number, and read that back to see what it was clipped to
                element.scrollLeft = 1e+10;

                var width = Math.max(element.scrollLeft + offset, element.scrollWidth - element.clientWidth) + 20;

                element.style.width = width + "px";
            }
            else if (type == "select") {
                var selectedIndex = element.selectedIndex > 0 ? element.selectedIndex : 0;

                // Need to use dummy element to measure :(
                var option = document.createElement("_");
                option.textContent = element.options[selectedIndex].textContent;
                element.parentNode.insertBefore(option, element.nextSibling);

                // The name of the appearance property, as it might be prefixed
                var appearance;

                for (var property in cs) {
                    var value = cs[property];
                    if (!/^(width|webkitLogicalWidth|length)$/.test(property) && typeof value == "string") {
                        //console.log(property, option.offsetWidth, cs[property]);
                        option.style[property] = value;

                        if (/appearance$/i.test(property)) {
                            appearance = property;
                        }
                    }
                }

                option.style.width = "";

                if (option.offsetWidth > 0) {
                    element.style.width = option.offsetWidth + "px";

                    if (!cs[appearance] || cs[appearance] !== "none") {
                        // Account for arrow
                        element.style.width = "calc(" + element.style.width + " + 2em)";
                    }
                }

                option.parentNode.removeChild(option);
                option = null;
            }

            if (empty) {
                element.value = "";
            }
        },

        // Autosize multiple elements
        resizeAll: function (elements) {
            $$(elements || _.selectors.base).forEach(function (element) {
                _.resize(element);
            });
        },

        active: true,

        // Will stretchy do anything for this element?
        resizes: function (element) {
            return element &&
                element.parentNode &&
                element.matches &&
                element.matches(_.selectors.base) &&
                element.matches(_.selectors.filter);
        },

        init: function () {
            _.selectors.filter = _.script.getAttribute("data-filter") ||
                ($$("[data-stretchy-filter]").pop() || document.body).getAttribute("data-stretchy-filter") || Stretchy.selectors.filter || "*";

            _.resizeAll();
        },

        $$: $$
    };

// Autosize all elements once the DOM is loaded

// DOM already loaded?
    if (document.readyState !== "loading") {
        _.init();
    }
    else {
        // Wait for it
        document.addEventListener("DOMContentLoaded", _.init);
    }

// Listen for changes
    var listener = function (evt) {
        if (_.active) {
            _.resize(evt.target);
        }
    };

    document.documentElement.addEventListener("input", listener);

// Firefox fires a change event instead of an input event
    document.documentElement.addEventListener("change", listener);

// Listen for new elements
    if (self.MutationObserver) {
        (new MutationObserver(function (mutations) {
            if (_.active) {
                mutations.forEach(function (mutation) {
                    if (mutation.type == "childList") {
                        Stretchy.resizeAll(mutation.addedNodes);
                    }
                });
            }
        })).observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

})();
