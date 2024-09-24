import { __awaiter } from "tslib";
import { MathfieldElement } from "mathlive";
import { MarkdownView, Modal, Notice, Plugin } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";
const DEFAULT_SETTINGS = {
    apiKey: "",
    useLocalInference: false,
    localInferenceUrl: "http://localhost:8502", // Default value
};
export default class MathLivePlugin extends Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            if (customElements.get("math-field") === undefined)
                customElements.define("math-field", MathfieldElement);
            this.addCommand({
                id: "open-modal",
                name: "Add full-line math",
                editorCallback: (editor, ctx) => {
                    new MathLiveModal(this.app, editor, this).open();
                },
            });
            this.addCommand({
                id: "open-modal-inline",
                name: "Add inline math",
                editorCallback: (editor, ctx) => {
                    new MathLiveModal(this.app, editor, this, true).open();
                },
            });
            yield this.loadSettings();
            this.addSettingTab(new MathliveSettingTab(this.app, this));
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}
export class MathliveSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        let { containerEl } = this;
        containerEl.empty();
        const title = document.createElement("h2");
        title.textContent = "Obsidian Mathlive";
        title.setCssStyles({
            fontSize: "28px",
        });
        containerEl.appendChild(title);
        const intro = `This plugin currently has 2 main features: a visual formula editor and an image to MathJax scanner.
The MathJax image scanner is available for free when self-hosting.
In addition, there is a cloud option that requires no setup.

* Self-hosting the image scanner may require technical knowledge of Docker and requires background processing resources. For most people, the cloud option is better.`;
        const introEl = document.createElement("p");
        introEl.textContent = intro;
        introEl.style.whiteSpace = "pre-wrap";
        containerEl.appendChild(introEl);
        new Setting(containerEl);
        const cloudTitle = document.createElement("h2");
        cloudTitle.textContent = "Cloud Settings";
        cloudTitle.setCssStyles({
            fontSize: "24px",
        });
        containerEl.appendChild(cloudTitle);
        new Setting(containerEl).setName("API key").addText((tc) => tc.setValue(this.plugin.settings.apiKey).onChange((val) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.apiKey = val;
            yield this.plugin.saveSettings();
        })));
        const homepageLink = document.createElement("a");
        homepageLink.href = "https://mathlive.danz.blog";
        homepageLink.text = "Create an API key here";
        containerEl.appendChild(homepageLink);
        new Setting(containerEl);
        const selfHostTitle = document.createElement("h2");
        selfHostTitle.textContent = "Self Hosting Settings";
        selfHostTitle.setCssStyles({
            fontSize: "24px",
        });
        containerEl.appendChild(selfHostTitle);
        new Setting(containerEl).setName("Self hosted").addToggle((toggle) => toggle
            .setValue(this.plugin.settings.useLocalInference)
            .onChange((val) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.useLocalInference = val;
            yield this.plugin.saveSettings();
        })));
        // New Setting for Local Inference URL
        new Setting(containerEl)
            .setName("Local Inference URL")
            .setDesc("Set the URL for local inference.")
            .addText((text) => text
            .setPlaceholder("http://localhost:8502")
            .setValue(this.plugin.settings.localInferenceUrl)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            value = value.trim();
            if (!value.startsWith("http://") &&
                !value.startsWith("https://")) {
                new Notice("Please enter a valid URL starting with http:// or https://");
                return;
            }
            this.plugin.settings.localInferenceUrl = value;
            yield this.plugin.saveSettings();
        })));
    }
}
class MathLiveModal extends Modal {
    constructor(app, editor, plugin, inline = false) {
        super(app);
        this.editor = editor;
        this.plugin = plugin;
        this.inline = inline;
    }
    parseSelection(selectionText) {
        if (selectionText.length === 0) {
            const wrapper = this.inline ? "$" : "$$";
            return {
                resultRenderTemplate: (result) => result.length > 0 ? wrapper + result + wrapper : "",
                initialLatex: "",
            };
        }
        const mathPreviewStartIndex = selectionText.indexOf("$$");
        if (mathPreviewStartIndex >= 0) {
            const mathPreviewEndIndex = selectionText.indexOf("$$", mathPreviewStartIndex + 2);
            if (mathPreviewEndIndex >= 0) {
                return {
                    resultRenderTemplate: (result) => selectionText.substring(0, mathPreviewStartIndex) +
                        "$$" +
                        result +
                        "$$" +
                        selectionText.substring(mathPreviewEndIndex + 2, selectionText.length),
                    initialLatex: selectionText.substring(mathPreviewStartIndex + 2, mathPreviewEndIndex),
                };
            }
        }
        const mathInlineStartIndex = selectionText.indexOf("$");
        if (mathInlineStartIndex >= 0) {
            const mathInlineEndIndex = selectionText.indexOf("$", mathInlineStartIndex + 1);
            return {
                resultRenderTemplate: (result) => selectionText.substring(0, mathInlineStartIndex) +
                    "$" +
                    result +
                    "$" +
                    selectionText.substring(mathInlineEndIndex + 1, selectionText.length),
                initialLatex: selectionText.substring(mathInlineStartIndex + 1, mathInlineEndIndex),
            };
        }
        return {
            resultRenderTemplate: (result) => result,
            initialLatex: selectionText,
        };
    }
    onOpen() {
        const modalContent = this.containerEl.querySelector(".modal-content");
        const header = this.initHeader(modalContent);
        this.initMadeByButton(header);
        this.initSupportButton(header);
        this.initMathlive(modalContent);
        this.initSubmitButton(modalContent);
        this.initImageScanner(modalContent);
    }
    initMathlive(modalContent) {
        var _a;
        const mathliveModalRoot = (_a = modalContent.parentElement) === null || _a === void 0 ? void 0 : _a.parentElement;
        mathliveModalRoot === null || mathliveModalRoot === void 0 ? void 0 : mathliveModalRoot.addClass("mathlive-modal-root");
        const keyboardContainer = window.createEl("div");
        keyboardContainer.addClass("virt-keyboard");
        mathliveModalRoot === null || mathliveModalRoot === void 0 ? void 0 : mathliveModalRoot.append(keyboardContainer);
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const selectionText = markdownView === null || markdownView === void 0 ? void 0 : markdownView.editor.getSelection();
        const parseResult = this.parseSelection(selectionText !== null && selectionText !== void 0 ? selectionText : "");
        if (!parseResult) {
            new Notice("MathLive: Failed to parse the selected text");
            this.close();
            return;
        }
        const { initialLatex, resultRenderTemplate } = parseResult;
        this.resultRenderTemplate = resultRenderTemplate;
        this.renderedResult = resultRenderTemplate(initialLatex);
        this.mfe = document.createElement("math-field");
        this.mfe.id = "mathfield";
        this.mfe.value = initialLatex;
        this.mfe.addEventListener("input", () => {
            var _a, _b;
            this.renderedResult = resultRenderTemplate((_b = (_a = this.mfe) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "");
        });
        window.mathVirtualKeyboard.container = keyboardContainer;
        modalContent.addClass("mathlive-modal-content");
        modalContent.appendChild(this.mfe);
        this.mfe.focus();
        setTimeout(() => document.getElementById("mathfield").focus(), 10);
    }
    initHeader(modalContent) {
        const header = document.createElement("div");
        header.addClass("header");
        modalContent.appendChild(header);
        return header;
    }
    initMadeByButton(modalContent) {
        const link = document.createElement("a");
        link.innerText = "👱‍♂️ Made by Dan Zilberman";
        link.addClass("badge");
        link.setAttr("href", "https://danzilberdan.github.io/");
        link.setAttr("target", "_blank");
        link.addClass("external-link");
        modalContent.appendChild(link);
    }
    initSupportButton(modalContent) {
        const link = document.createElement("a");
        link.innerText = "☕ Support";
        link.addClass("badge");
        link.setAttr("href", "https://www.buymeacoffee.com/danzilberdan");
        link.setAttr("target", "_blank");
        link.addClass("external-link");
        modalContent.appendChild(link);
    }
    initSubmitButton(modalContent) {
        const submitButton = document.createElement("button");
        submitButton.innerText = "Insert";
        submitButton.addClass("submit");
        submitButton.addEventListener("click", this.close.bind(this));
        modalContent.appendChild(submitButton);
    }
    initImageScanner(modalContent) {
        const scan = document.createElement("button");
        scan.innerText = "Scan MathJax from Clipboard";
        scan.addClass("scan-button");
        scan.onclick = this.onImageScanRequest.bind(this);
        modalContent.appendChild(scan);
    }
    onImageScanRequest() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin.settings.apiKey) {
                new Notice("Please open plugin settings to create API key.");
                return;
            }
            try {
                const clipboardItems = yield navigator.clipboard.read();
                for (const item of clipboardItems) {
                    for (const type of item.types) {
                        if (item.types.includes("image/png")) {
                            const blob = yield item.getType(type);
                            new Notice("Scanning MathJax image");
                            const mathjax = yield this.scanImage(blob);
                            this.mfe.value += mathjax;
                            this.renderedResult = this.resultRenderTemplate((_b = (_a = this.mfe) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "");
                            new Notice(`Got scan result for MathJax`);
                            return;
                        }
                    }
                }
                new Notice("No image found in clipboard.");
            }
            catch (error) {
                console.error("Error reading clipboard or uploading image:", error);
                new Notice(`Failed to scan image. See console for details.`);
            }
        });
    }
    scanImage(imageData) {
        return __awaiter(this, void 0, void 0, function* () {
            let address = "https://mathlive-ocr.danz.blog";
            if (this.plugin.settings.useLocalInference) {
                address =
                    this.plugin.settings.localInferenceUrl ||
                        "http://localhost:8502";
            }
            const formData = new FormData();
            formData.append("file", imageData);
            const res = yield fetch(`${address}/predict/`, {
                headers: {
                    "Api-key": this.plugin.settings.apiKey,
                },
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                throw new Error(`Server error: ${res.status} ${res.statusText}`);
            }
            return yield res.json();
        });
    }
    convertToJPEG(imageData) {
        return __awaiter(this, void 0, void 0, function* () {
            const img = new Image();
            img.src = imageData;
            yield new Promise((resolve) => {
                img.onload = resolve;
            });
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL("image/jpeg", 0.8);
        });
    }
    onClose() {
        if (!!this.renderedResult)
            this.editor.replaceSelection(this.renderedResult);
    }
}
