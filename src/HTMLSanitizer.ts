/**
 * Created by darylcecile on 11/01/2019.
 */

type onAttributeHandler = (nodeName:string, attrName:string, attrVal:string) => string;
type onCssHandler = (nodeName:string,cssName:string,cssValue:any)=>any;
type onNodeHandler = (node)=>HTMLElement|undefined|false;

class HTMLSanitizer{
    private allowedNodes;
    private virtualDoc:Document;
    private keepComments:boolean;

    private onAttr:onAttributeHandler = (nodeName,attrName,attrVal) => { return attrVal };
    private onCss:onCssHandler = (nodeName,cssName,cssValue) => { return cssValue };
    private onNode:onNodeHandler = (n) => { return n };

    constructor({allowedNodes,keepComments=true}){
        this.allowedNodes = allowedNodes;
        this.virtualDoc = document.implementation.createHTMLDocument("");
        this.keepComments = keepComments;
    }

    onAttribute(handler:onAttributeHandler){
        this.onAttr = handler;
        return this;
    }

    onStyle(handler:onCssHandler){
        this.onCss = handler;
        return this;
    }

    onTag(handler:onNodeHandler){
        this.onNode = handler;
        return this;
    }

    sanitizeString(content:string){
        let c = this.virtualDoc.createElement('div');
        c.innerHTML = content;

        if (c.children.length === 0){
            return c.innerHTML;
        }
        else{
            let container = this.virtualDoc.createElement('div');
            container.innerHTML = "";
            Array.from(c.children).forEach(n=>{
                container.appendChild( this.sanitizeNode(n) );
            });
            return container.innerHTML;
        }
    }

    sanitizeStringSafe(content:string){
        let c = this.virtualDoc.createElement('div');
        c.innerHTML = content;

        if (c.children.length === 0){
            return c.innerHTML;
        }
        else{
            let container = this.virtualDoc.createElement('div');
            container.innerHTML = "";
            Array.from(c.children).forEach(n=>{
                container.appendChild( this.sanitizeNodeSafe(n) );
            });
            return container.innerHTML;
        }
    }

    sanitize(content:string){
        let c = this.virtualDoc.createElement('span');
        $(c).append(content);

        let container = this.virtualDoc.createElement('span');
        container.innerHTML = "";

        Array.from($(c).children()).forEach(n=>{
            container.appendChild( this.sanitizeNodeSafe(n) );
        });

        return container.innerHTML;
    }

    sanitizeNode(node){
        let nodeName = node.nodeName.toLowerCase();

        if (nodeName === "#text") {
            if (node['data'].trim().length === 0) return this.virtualDoc.createTextNode('');
            return node;
        }
        if (nodeName === "#comment") {
            if (this.keepComments) return node;
            return this.virtualDoc.createTextNode('');
        }
        if (node.innerHTML === ""){
            return this.virtualDoc.createTextNode('');
        }
        if (this.allowedNodes.indexOf(nodeName) === -1 && this.allowedNodes.length > 0) {
            let p = this.virtualDoc.createElement('p');
            p.innerHTML = this.sanitizeString(node.innerHTML);
            node = p;
            return p;
        }

        let newNode = this.onNode(node);

        if (newNode === false){
            return this.virtualDoc.createTextNode('');
        }
        else{
            if (newNode === undefined){
                newNode = <HTMLElement>this.virtualDoc.createElement(nodeName);
            }

            for (let i = 0; i < node.attributes.length; i++){
                let n:Attr = node.attributes[i];
                let attrName = n.name;
                let attrValue = n.value;

                if (attrName !== "style"){
                    let res = this.onAttr(nodeName,attrName,attrValue);

                    if (res !== null){
                        newNode.setAttribute(attrName, res);
                    }
                }
            }

            for (let i = 0; i < node.style.length; i++){
                let propertyName = node.style[i];
                let propertyValue = node.style[propertyName];

                let res = this.onCss(nodeName,propertyName,propertyValue);

                if (res !== null){
                    newNode.style[propertyName] = res;
                }

            }

            while (node.childNodes.length > 0) {
                let child = node.removeChild(node.childNodes[0]);
                newNode.appendChild(this.sanitizeNode(<any>child));
            }
        }

        return newNode;

    }

    sanitizeNodeSafe(node){
        let nodeName = node.nodeName.toLowerCase();

        if (nodeName === "#text") {
            if (node.data.trim().length === 0) return this.virtualDoc.createTextNode('');
            return node;
        }
        if (nodeName === "#comment") {
            if (this.keepComments) return node;
            return this.virtualDoc.createTextNode('');
        }
        if (node.innerHTML === ""){
            return this.virtualDoc.createTextNode('');
        }
        if (this.allowedNodes.indexOf(nodeName) === -1 && this.allowedNodes.length > 0) {
            let div = this.virtualDoc.createElement('div');

            while (node.childNodes.length > 0) {
                let child = node.removeChild(node.childNodes[0]);
                $(div).append(this.sanitizeNodeSafe(child));
            }

            return div.childNodes;
        }

        let newNode = this.onNode(node);

        if (newNode === false){
            return this.virtualDoc.createTextNode('');
        }
        else{
            if (newNode === undefined){
                newNode = <HTMLElement>this.virtualDoc.createElement(nodeName);
            }

            for (let i = 0; i < node.attributes.length; i++){
                let n:Attr = node.attributes[i];
                let attrName = n.name;
                let attrValue = n.value;

                if (attrName !== "style"){
                    let res = this.onAttr(nodeName,attrName,attrValue);

                    if (res !== null){
                        newNode.setAttribute(attrName, res);
                    }
                }
            }

            for (let i = 0; i < node.style.length; i++){
                let propertyName = node.style[i];
                let propertyValue = node.style[propertyName];

                let res = this.onCss(nodeName,propertyName,propertyValue);

                if (res !== null){
                    newNode.style[propertyName] = res;
                }

            }

            while (node.childNodes.length > 0) {
                let child = node.removeChild(node.childNodes[0]);
                // newNode.appendChild(this.sanitizeNodeSafe(child));
                $(newNode).append(this.sanitizeNodeSafe(child));
            }
        }

        return newNode;

    }

}