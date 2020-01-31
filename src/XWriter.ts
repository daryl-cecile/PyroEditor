/// <reference path="../node_modules/@types/jquery/index.d.ts"/>

declare const Host:XWriter;

type XWriterFile = {
    title: string;
    snippet: string;
    content: string;
    isDraft: boolean;
    eVersion: string;
};

type XWriterOptions = {
    warnUnSavedChangesWhenLeaving: boolean,
    resourceBasePath: string
}

class XWriter extends HTMLElement{

    static get observedAttributes() { return []; }

    private pauseTracker:boolean = false;
    private readonly _shadowRoot:ShadowRoot;
    private readonly sanitizer:HTMLSanitizer;

    private selectedText = "";
    private interval = null;
    private kitVisible = false;

    private hasUnsavedChanges = false;

    private $writerPad;
    private $writerTitle;
    private $writerSubtitle;
    private $writerContainer;
    private $globalAdder;
    private $target;

    private options:XWriterOptions = {
        warnUnSavedChangesWhenLeaving: true,
        resourceBasePath: ""
    };

    private middleWares = {
        parseJSON: (text:string, reviver?)=>{
            return JSON.parse(text,reviver);
        },
        showPromptBox: (title:string, defaultText:string, placeholder:string, callback?)=>{
            let response = window.prompt(title,defaultText);
            if (callback && response){
                callback(response)
            }
        },
        showAlertBox: (title:string, message:string, callback?)=>{
            window.alert(message);
            if (callback) callback();
        },
        convertToSecureSource: (src)=>{
            let parts = src.toLowerCase().split("://");
            if (parts.length <= 1){
                return `https://${src}`;
            }
            else if (parts[0] !== "https"){
                return `https${ src.substr( parts[0].length-1 ) }`;
            }
            else{
                return src;
            }
        },
        escapeHTML:(val)=>{
            if (this.sanitizer){
                return this.sanitizer.sanitize(val);
            }
            // TODO bring in custom html cleaner
            return val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }
    };

    constructor(){
        super();
        this._shadowRoot = this.attachShadow({mode: 'open'});
        this.initBody();

        $('body').append(
            $('<link/>').attr({
                rel:'stylesheet',
                href: 'https://use.fontawesome.com/releases/v5.5.0/css/all.css'
            })
        );

        this.$writerPad = this.$find('.writer-pad');
        this.$writerTitle = this.$find('.writer-title');
        this.$writerSubtitle = this.$find('.writer-sub-title');
        this.$writerContainer = this.$find('.writer-container');
        this.$globalAdder = $();
        this.$target = this.$writerPad.children().first();

        this.sanitizer = new HTMLSanitizer({
            allowedNodes:['p','b','i','strong','em','img','figcaption','figure','u','blockquote','a'],
            keepComments:false
        });

        this.sanitizer.onAttribute((nodeName,attr,val)=>{
            return XWriter.extendedSwitch(nodeName,attr)
                .when("img","src",()=>{
                    // secure url
                    return this.middleWares.convertToSecureSource(val);
                })
                .otherwise(()=>{
                    if (attr === "class" || attr === "data-is") return val;
                    else return null;
                });

        }).onStyle((nodeName,prop,val)=>{
            return null;
        }).onTag( node => {
            if (node.tagName.toUpperCase() === "A"){
                node.setAttribute('rel','noopener');
                node.setAttribute('target','_blank');
                return node;
            }
            return undefined;
        });

        this.start();

        window.addEventListener('beforeunload', (event) => {
            if (this.hasUnsavedChanges){
                // Cancel the event as stated by the standard.
                event.preventDefault();
                // Chrome requires returnValue to be set.
                event.returnValue = '';
            }
        });
    }

    public init(){
        $(this._shadowRoot).append(
            $('<link/>').attr({
                rel:"stylesheet",
                href: this.normalizeResourcePath("css/lens.css")
            })
        );

        $(this._shadowRoot).append(
            $('<link/>').attr({
                rel:"stylesheet",
                href: this.normalizeResourcePath("css/writerpro.css")
            })
        );
        console.log('in');
    }

    connectedCallback() {
        this.style.width = "100%";
    }
    disconnectedCallback() {}
    attributeChangedCallback(attrName, oldVal, newVal) {}

    private $find(selector){
        return $(selector, this._shadowRoot);
    }

    public setOption(name:string,value:any){
        this.options[name] = value;
        return this;
    }

    public setMiddleWare(name:string, handler:Function){
        this.middleWares[name] = handler;
        return this;
    }

    private initBody(){
        let initialBody = this._shadowRoot.innerHTML;
        this._shadowRoot.innerHTML =
            `
            <style>
                @import "https://use.fontawesome.com/releases/v5.5.0/css/all.css";
            </style>
            <div class="writer-container" >
                <input type="hidden" name="title" value="">
                <input type="hidden" name="snippet" value="">
                
                <div class="writer-hero"></div>

                <div class="writer-title" contenteditable="true"></div>

                <div class="writer-sub-title" contenteditable="true"></div>

                <div class="writer-pad">
                    ${ initialBody.length === 0 ? '<p class="element"></p>' : initialBody }
                </div>

            </div>

            <div class="writer-kit" id="formatting">
                <button onclick="XWriter.selectionTransformer.makeBold()"><i class="fas fa-bold"></i></button>
                <button onclick="XWriter.selectionTransformer.makeItalic()"><i class="fas fa-italic"></i></button>
                <button onclick="XWriter.selectionTransformer.makeUnderline()"><i class="fas fa-underline"></i></button>
                <button onclick="XWriter.selectionTransformer.makeStrike()"><i class="fas fa-strikethrough"></i></button>
                <button onclick="XWriter.selectionTransformer.clearFormat()"><i class="fas fa-eraser"></i></button>
                <span class="sep"></span>
                <button onclick="XWriter.selectionTransformer.alignLeft()"><i class="fas fa-align-left"></i></button>
                <button onclick="XWriter.selectionTransformer.alignCenter()"><i class="fas fa-align-center"></i></button>
                <button onclick="XWriter.selectionTransformer.alignRight()"><i class="fas fa-align-right"></i></button>
                <button onclick="XWriter.selectionTransformer.alignJustified()"><i class="fas fa-align-justify"></i></button>
                <span class="sep"></span>
                <button id="kit-link"><i class="fas fa-link"></i></button>
            </div>`;

        this._shadowRoot.querySelector('#kit-link').addEventListener('click', ()=>{
            XWriter.selectionTransformer.makeHyperlink.call(this)
        });

        return this;
    }

    private triggerEvent(name:string, data:any = {}){
        const e = new CustomEvent(name, {
            bubbles: true,
            detail: data
        });
        this.dispatchEvent(e);
    }

    private start(){
        let self = this;
        let inputTimeout = null;

        this.$writerPad.on("keypress", function(){
            self.hasUnsavedChanges = true;
            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(function(){
                self.triggerEvent("content_updated")
            },750);
        });

        this.$writerPad.on('mouseover',function(evt){

            let e = evt.originalEvent;
            self.$find('.h').removeClass('h');

            let el = $(self._shadowRoot.elementFromPoint(e.clientX,e.clientY));

            if ( self.$find('.writer-tools.opened').length === 0 && self.$find('.right-click-menu').length === 0 && self.pauseTracker === false ){
                if ( el.parent().is(self.$writerPad) ){
                    self.$target = el;
                }
            }

        });

        this.$writerPad.on('contextmenu',function(evt){
            let e = evt.originalEvent;
            e.preventDefault();

            self.makeContextMenu(e.clientX,e.clientY,(opt)=>{

                self.$writerPad.focus();

                switch (opt){
                    case "delete":
                        self.$target.remove();
                        self.$target = self.$writerPad.children().first();
                        break;
                    case "clone":
                        let $newTarget = self.$target.clone();
                        $newTarget.insertAfter(self.$target);
                        self.$target = $newTarget;
                        break;
                    case "edit":
                        self.pauseTracker = true;
                        let target = self.$target.get(0);
                        let name = "paragraph"; //default element
                        if (target.hasAttribute('data-name')) name = target.getAttribute('data-name');
                        self.callPluginEditor(name, target, function(){
                            self.pauseTracker = false;
                        });
                        break;
                    default:
                        console.log(opt);
                }

            });
        });

        this.$writerPad.on('paste',function(evt){
            let e = evt.originalEvent;
            e.stopPropagation();
            e.preventDefault();

            let clipboardData = e.clipboardData || window['clipboardData'];

            let dx = clipboardData.getData('text/plain').split("\n");

            dx.forEach(i=>{
                if (i.trim().length > 0){
                    let d = $("<p>"+ i +"</p>");
                    self.$writerPad.append(d);
                }
            });
        });

        this.$writerTitle.on('paste',function(evt){
            evt.originalEvent.preventDefault();
            evt.originalEvent.stopPropagation();
        });

        this.$writerSubtitle.on('paste',function(evt){
            evt.originalEvent.preventDefault();
            evt.originalEvent.stopPropagation();
        });

        this.$writerContainer.append(this.makeAdder());

        this.$writerPad.on('mouseup keyup selectionchange',function(){
            self.selectedText = self.getSelectedText();
            let $k = $('.writer-kit', self._shadowRoot);
            if (self.selectedText.length > 0){
                if (self.interval === null){
                    self.interval = setInterval(()=>{
                        requestAnimationFrame(()=>{
                            if ( (self.getSelectedText() || "").length === 0 ){
                                clearInterval(self.interval);
                                self.interval = null;
                                if (self.kitVisible === true){
                                    self.kitVisible = false;
                                    $k.css({opacity:0,pointerEvents:'none'});
                                }
                            }
                            else{
                                if (self.kitVisible === false){
                                    self.kitVisible = true;
                                    let e = $(self.getActiveNode());
                                    let eo = e.offset();
                                    let er = eo.top - 42;

                                    $k.css({
                                        opacity:1,
                                        pointerEvents:'auto',
                                        left: eo.left,
                                        top: er
                                    });
                                }
                            }
                        });
                    },100);
                }
            }
        });

        this.$writerPad.attr('contenteditable',true);

        setInterval(()=>{
            if (self.$target)
            self.$globalAdder.css({
                top: self.$target.position().top + self.$target.outerHeight(true)
            });
        },200);

        $('.writer-sub-title', this._shadowRoot).on('keyup',function(){
            $('[name=snippet]', self._shadowRoot).val(this.innerText);
        });

        $('.writer-title', this._shadowRoot).on('keyup',function(){
            $('[name=title]', self._shadowRoot).val(this.innerText);
        });

        window['resizeIframe'] = function(obj){
            let w = parseFloat(window.getComputedStyle(obj).width.match(/\d/g).join(""));
            $(obj).animate({height: ((w/16)*9) + 'px'},500);
        };
    }

    private getActiveNode(){
        let node = this._shadowRoot.getSelection().anchorNode;
        return (node.nodeName === "#text" ? node.parentNode : node);
    }

    private getTextNodesIn(node:Node){
        let textNodes = [];
        if (node.nodeType === 3) {
            textNodes.push(node);
        } else {
            let children = node.childNodes;
            for (let i = 0, len = children.length; i < len; ++i) {
                textNodes.push.apply(textNodes, this.getTextNodesIn(children[i]));
            }
        }
        return textNodes;
    }

    private setSelectionRange(start,end,el=null){
        if (el === null) el = this.getActiveNode();
        if (document.createRange && this._shadowRoot.getSelection) {
            let range = document.createRange();
            range.selectNodeContents(el);
            let textNodes = this.getTextNodesIn(el);
            let foundStart = false;
            let charCount = 0, endCharCount;

            for (let i = 0, textNode; textNode = textNodes[i++]; ) {
                endCharCount = charCount + textNode.length;
                if (!foundStart && start >= charCount && (start < endCharCount || (start === endCharCount && i <= textNodes.length))) {
                    range.setStart(textNode, start - charCount);
                    foundStart = true;
                }
                if (foundStart && end <= endCharCount) {
                    range.setEnd(textNode, end - charCount);
                    break;
                }
                charCount = endCharCount;
            }

            let sel = this._shadowRoot.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (this._shadowRoot['selection'] && document['createTextRange']) {
            // IE
            let textRange = document.body['createTextRange']();
            textRange.moveToElementText(el);
            textRange.collapse(true);
            textRange.moveEnd("character", end);
            textRange.moveStart("character", start);
            textRange.select();
        }
    }

    private async save(asDraft:boolean=false){
        return new Promise<XWriterFile>(async resolve => {
            let fileData:XWriterFile = {
                title: <string>$("[name='title']", this._shadowRoot).val(),
                snippet: <string>$("[name='snippet']", this._shadowRoot).val(),
                content: await this.getContent(),
                isDraft: asDraft,
                eVersion: "4"
            };

            this.triggerEvent("saved",{
                file: fileData
            });

            this.hasUnsavedChanges = false;

            resolve(fileData);
        });
    }

    private async verifyArticle(){
        let val = await this.getContent();
        let title = (<string>$("[name='title']", this._shadowRoot).val() || "").trim();

        return !!(title.length > 1 && (val));
    }

    //TODO REVIEW
    public showTwinChoice(choiceA, choiceB){
        let prompt =
            $(`<div class='lens-prompt-shade'>  
           <div class="lens-prompt fitmax">
               <button>${choiceA.content}</button>
               <button>${choiceB.content}</button>
           </div>
       </div>`);

        let hidePrompt = ()=>{
            prompt.removeClass('show');
            setTimeout(()=>{
                prompt.remove();
            },300);
        };

        this._shadowRoot.appendChild(prompt[0]);

        prompt.find('button:nth-of-type(1)').on('click',function(){
            if (choiceA.callback) choiceA.callback();
            hidePrompt();
        });

        prompt.find('button:nth-of-type(2)').on('click',function(){
            if (choiceB.callback) choiceB.callback();
            hidePrompt();
        });

        setTimeout(()=>{
            prompt.addClass('show');

            $('body').one('click',function(){
                hidePrompt();
            });
        },100);
    }

    public showPrompt({title="Please enter",defaultText="",placeholder=""},callback){
        this.middleWares.showPromptBox(title,defaultText,placeholder,callback);
        return this;
    }

    public showAlert(title:string, message:string, callback?){
        this.middleWares.showAlertBox(title, message, callback);
    }

    public registerPlugin(name:string){
        let r = {
            defineCreator:(handler)=>{
                this.setPluginCreate(name, function(callback){
                    handler((element)=>{
                        if (element){
                            $(element).attr('data-name',name);
                            callback(element);
                        }
                        else{
                            callback();
                        }
                    });
                });
                return r;
            },
            defineEditor:(handler)=>{
                this.setPluginEditor(name, handler);
                return r;
            }
        };

        return r;
    }

    private normalizeResourcePath(resource:string) {
        return `${this.options.resourceBasePath}/${resource}`;
    }

    public loadPluginScript(name:string){
        $.get(this.normalizeResourcePath(`lens-blocks/${name}.js?t=${+ new Date()}`),(v)=>{
            let f = new Function('Host',v);
            f(this);
        },"text");
    }

    public escapeHTML(val:string){
        return this.middleWares.escapeHTML(val);
    }

    public getSecuredSource(src){
        return this.middleWares.convertToSecureSource(src);
    }

    public secureIframe(frame:HTMLIFrameElement){
        $(frame).wrap('<div data-is="block" class="element ext-element" contenteditable="false"></div>');
        return $(frame).parent();
    }

    public static selectionTransformer = Object.freeze({
        makeHyperlink(){
            let s = this._shadowRoot.getSelection();
            let o = {
                start: s.anchorOffset,
                end: s.focusOffset,
                node: s.anchorNode
            };

            let n = this.getActiveNode();

            if ( n.tagName === "A" ){
                document.execCommand('unlink',false);
            }
            else{
                this.showPrompt({
                    title:"Enter Link:"
                },(val)=>{
                    if (val !== "" && val !== null){
                        // this.$writerPad.focus();
                        this.setSelectionRange(o.start,o.end,o.node);
                        document.execCommand('createLink',false,val);
                        let na = this.getActiveNode();
                        na.classList.add('link');
                        na.setAttribute('target','_blank');
                        na.setAttribute('rel','noopener');
                    }
                });
            }
        },
        makeBold:()=>{
            document.execCommand('bold',false);
        },
        makeItalic:()=>{
            document.execCommand('italic',false);
        },
        makeUnderline:()=>{
            document.execCommand('underline',false);
        },
        clearFormat:()=>{
            document.execCommand('removeFormat',false);
        },
        makeStrike:()=>{
            document.execCommand('strikeThrough',false);
        },
        alignLeft:()=>{
            document.execCommand('justifyLeft',false);
        },
        alignRight:()=>{
            document.execCommand('justifyRight',false);
        },
        alignCenter:()=>{
            document.execCommand('justifyCenter',false);
        },
        alignJustified:()=>{
            document.execCommand('justifyFull',false);
        }
    });

    public brace = {
        blockCreator : {
            paragraph(callback){
                callback( this.$ElementMaker('<p></p>') );
            }
        },
        blockEditor : {
            paragraph(element,done){
                $(element).focus();
                done();
            }
        }
    };

    public setPluginCreate(name:string, handler:any){
        this.brace.blockCreator[name] = handler.bind(this);
    }

    public setPluginEditor(name:string, handler:any){
        this.brace.blockEditor[name] = handler.bind(this);
    }

    public callPluginCreate(name:string, cb:any){
        this.brace.blockCreator[name].bind(this)(cb);
    }

    public callPluginEditor(name:string, target:any, cb:any){
        this.brace.blockEditor[name].bind(this)(target, cb);
    }

    public $ElementMaker(tagName,contents?){

        let es = (tagName.indexOf('<') > -1 ? tagName : `<${tagName}/>`);
        let e = $(es);
        contents = contents || [];
        if (!Array.isArray(contents)) contents = [contents];
        contents.forEach(c=>{
            e.append($(c));
        });
        return e;

    }

    public async getContent(){
        return new Promise<string>((resolve, reject) => {
            let pad = this.$writerPad.clone();
            pad.find('iframe').unwrap('[data-is="block"]');
            pad.find('[contenteditable="true"]').attr('contenteditable','x-true');
            let content = HTMLObjectifier.Deobjectify(HTMLObjectifier.Objectify(pad)).innerHTML;

            content += `
            <script >
                function resizeIframe(obj){
                    let w = window.getComputedStyle(obj).width.match(/\d/g).join("") * 1;
                    $(obj).animate({height: ((w/16)*9) + 'px'},500);
                }
            </script>`;

            resolve( content );
        });
    }

    public setContent(val){
        this.$writerPad.html(val);

        this.fixContent();

        // make this function single use
        this.setContent = function(){};
    }

    private fixContent(){
        this.$writerPad.find('iframe').each((i,e)=>{
            if ( $(e).parent().is('[data-is="block"]') === false ){
                this.secureIframe(e);
            }
        });

        this.$writerPad.find('[contenteditable="x-true"]').attr("contenteditable","true");
    }

    private addPlugin(pluginName){

        this.installPlugin(pluginName,(r)=>{

            this.disableTool();
            this.closeTool();

            if (r){
                r.insertAfter(this.$target);
                this.$target = r;
            }

        });

    };

    private installPlugin(blockName, callback){
        this.callPluginCreate(blockName, function(r){
            if (r) r.addClass('element');
            callback(r);
        });
    }

    private makeAdder(){
        let self = this;

        let $adder = this.$ElementMaker('<div class="w-pointer"/>',[
            this.$ElementMaker('<div class="w-add"/>',[
                this.$ElementMaker('<i class="fas fa-plus"></i>')
            ])
        ]);

        $adder.on('click','.w-add',function(){

            let $tool = self.makeTool();

            self._shadowRoot.appendChild($tool[0]);

            $tool.css({
                top: $(this).offset().top,
                left: $(this).offset().left
            });

            setTimeout(()=>{
                $tool.addClass('opened');
            },200);

        });

        this.$globalAdder = $adder;

        return $adder;

    }

    private makeContextMenu(x,y,clickCallback){
        $('.right-click-menu', this._shadowRoot).remove();

        let menu = this.$ElementMaker("<ul class='right-click-menu'></ul>",[
            this.$ElementMaker('<li><i class="fas fa-pen" style="color:#27b385"></i><span>Edit</span><kbd></kbd></li>').on('click',()=>clickCallback('edit')),
            this.$ElementMaker('<li><i class="far fa-clone" style="color:#48adff"></i><span>Clone</span><kbd></kbd></li>').on('click',()=>clickCallback('clone')),
            this.$ElementMaker('<li></li>'),
            this.$ElementMaker('<li><i class="fas fa-trash-alt" style="color:#ff4853"></i><span>Delete</span><kbd>DEL</kbd></li>').on('click',()=>clickCallback('delete'))
        ]);

        menu.css({
            top : y,
            left : x + 5
        });

        $('body').one('click',()=>{
            menu.removeClass('opened');
            setTimeout(()=>{
                menu.remove();
            },10);
        });

        this._shadowRoot.appendChild(menu[0]);

        setTimeout(()=>{
            menu.addClass('opened');
        },200);
    }

    public disableTool(){
        let $tool = $('.writer-tools', this._shadowRoot);
        $tool.css({
            pointerEvents:'none'
        });
    }

    public closeTool(){
        let $tool = $('.writer-tools', this._shadowRoot);
        $tool.removeClass('opened');
        setTimeout(()=>{
            $tool.remove();
        },500);
    }

    private makeTool(){
        let shouldClose = false;
        let closeTimeout = null;
        let self = this;

        let $tool = this.$ElementMaker('<div class="writer-tools" id="widgets"/>', [
            this.$ElementMaker('button', '<i class="fas fa-times"></i>').on('click', ()=> this.closeTool()),
            this.$ElementMaker('<span class="sep"></span>'),
            this.$ElementMaker('button', '<i class="fas fa-quote-left"></i>').attr('title','Blockquote').on('click', () => this.addPlugin('quote')),
            this.$ElementMaker('button', '<i class="fas fa-camera"></i>').attr('title','Unsplash stock images').on('click', () => this.addPlugin('unsplash')),
            this.$ElementMaker('button','<i class="fab fa-soundcloud"></i>').attr('title','SoundCloud').on('click',()=> this.addPlugin('soundcloud')),
            this.$ElementMaker('button', '<i class="fas fa-font"></i>').attr('title','Paragraph').on('click', () => this.addPlugin('paragraph')),
            this.$ElementMaker('button', '<i class="fas fa-code"></i>').attr('title','Code Snippet').on('click', () => this.addPlugin('code')),
            this.$ElementMaker('button', '<i class="fas fa-globe"></i>').attr('title','Website').on('click', () => this.addPlugin('website')),
            this.$ElementMaker('button', '<i class="fab fa-youtube"></i>').attr('title','YouTube').on('click', () => this.addPlugin('youtube')),
            this.$ElementMaker('button', '<i class="far fa-image"></i>').attr('title','Image').on('click', () => this.addPlugin('image')),
            this.$ElementMaker('button', '<i class="fas fa-map-marker-alt"></i>').attr('title','Map').on('click',()=> this.addPlugin('map')),
            this.$ElementMaker('button', '<i class="far fa-images"></i>').attr('title','SlideShow').on('click',()=>this.addPlugin('slideshow'))
        ]);

        $tool.on('mouseleave', function(){
            console.log("out");
            shouldClose = true;
            clearTimeout(closeTimeout);
            closeTimeout = setTimeout(function(){
                $tool.removeClass('opened');
                setTimeout(()=>{
                    $tool.remove();
                },500);
                console.log("close");
                shouldClose = false;
            },500);
        }).on('mouseenter', function(){
            console.log("in");
            if (shouldClose){
                clearTimeout(closeTimeout);
            }
        });

        return $tool;
    }

    private getCurrentlyFocusedParagraph(asJq:false):HTMLElement
    private getCurrentlyFocusedParagraph(asJq:true):JQuery<HTMLElement>
    private getCurrentlyFocusedParagraph(asJq:boolean=false){
        let $p = this.$find('[contenteditable]:focus');
        return (asJq ? $p : $p.get(0));
    }

    private getPreviousParagraph(asJq=false){
        let $p = this.getCurrentlyFocusedParagraph(true).prev('[contenteditable]');
        return (asJq ? $p : $p.get(0));
    }

    private getNextParagraph(asJq=false){
        let $p = this.getCurrentlyFocusedParagraph(true).next('[contenteditable]');
        return (asJq ? $p : $p.get(0));
    }

    private getCaretCharacterOffsetWithin(element) {
        let caretOffset = 0;
        let doc = element.ownerDocument || element.document;
        let win = this._shadowRoot;
        let sel;
        if (typeof win.getSelection != "undefined") {
            sel = win.getSelection();
            if (sel.rangeCount > 0) {
                let range = win.getSelection().getRangeAt(0);
                let preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(element);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                caretOffset = preCaretRange.toString().length;
            }
        } else if ((sel = doc.selection) && sel.type != "Control") {
            let textRange = sel.createRange();
            let preCaretTextRange = doc.body.createTextRange();
            preCaretTextRange.moveToElementText(element);
            preCaretTextRange.setEndPoint("EndToEnd", textRange);
            caretOffset = preCaretTextRange.text.length;
        }
        return caretOffset;
    }

    private getSelectedText(){
        let text = "";
        let activeEl:HTMLInputElement = <any>this._shadowRoot.activeElement;
        let activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
        if (
            (activeElTagName == "textarea") || (activeElTagName == "input" &&
            /^(?:text|search|password|tel|url)$/i.test(activeEl.type)) &&
            (typeof activeEl.selectionStart == "number")
        ) {
            text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
        } else if (this._shadowRoot.getSelection) {
            text = this._shadowRoot.getSelection().toString();
        }
        return text;
    }

    private static extendedSwitch(...checks){
        let breakOut = false;
        let result = null;
        let r = {
            when : (...args)=>{
                if (checks.length >= args.length) throw new Error("You case senario has no handler. The last parameter of 'when' should be the handler function");
                if (breakOut){
                    let passes = true;
                    checks.forEach((check,index)=>{
                        if (check !== args[index]){
                            passes = false;
                        }
                    });

                    if (passes) {
                        result = args[args.length - 1].call(this);
                        breakOut = true;
                    }
                }
                return r;
            },
            otherwise : (action)=>{
                if (breakOut === false){
                    result = action.call(this);
                }
                return result;
            }
        };
        return r;
    }

    public get docTitle(){
        return $("[name='title']", this._shadowRoot).val() || "";
    }

    public get titleAsSlug(){
        return this.docTitle.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    }

    public get document(){
        return this._shadowRoot;
    }
}

customElements.define('x-writer', XWriter);