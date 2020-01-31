/**
 * Created by darylcecile on 11/01/2019.
 */

class HTMLObjectifier{

    /**
     *
     * @param {HTMLElement} node
     * @constructor
     */
    static CreateNodeObject(node){

        let o = {
            name:(node.nodeType === 1 ? node.nodeName : "#text"),
            attr: {},
            children:[],
            type:node.nodeType,
            value:(node.nodeType === 3 ? node.data : '')
        };

        if (node.nodeType === 1){
            for(let i = 0; i < node.attributes.length; i++){
                let attr = node.attributes.item(i);
                if (attr.name.trim().toLowerCase().indexOf('on') !== 0){
                    let v = attr.value;
                    if ( v.trim().toLowerCase().indexOf('javascript:') === 0 ) {
                        console.warn('HTMLObjectifier: Removed potentially dangerous attribute value "' + v + '"');
                        v = '#';
                    }
                    o.attr[attr.name] = v;
                }
                else{
                    console.warn("HTMLObjectifier: Removed " + attr.name + " from " + o.name);
                }
            }

            $(node).contents().each((i,e)=>{
                let nodeObject = HTMLObjectifier.CreateNodeObject(e);
                if (nodeObject.type === 1){
                    let childFaked;
                    try{
                        childFaked = document.createElement(nodeObject.name);
                        if ( !(childFaked instanceof HTMLUnknownElement) ){
                            o.children.push(nodeObject);
                        }
                        else{
                            console.warn("HTMLObjectifier: Removed unidentified element " + nodeObject.name);
                        }
                    }
                    catch(ex){
                        console.warn("HTMLObjectifier: Skipping unknown element " + nodeObject.name);
                    }
                }
                else if (nodeObject.type === 3){
                    o.children.push(nodeObject);
                }
            });
        }

        return o;
    }

    static Objectify(s){
        s = $(s);
        return HTMLObjectifier.CreateNodeObject(s.get(0));
    }

    static Deobjectify(o){
        let e;

        if ( o.type === 1 ){
            e = document.createElement(o.name);
            Object.keys(o.attr).forEach(k=>{
                e.setAttribute(k,o.attr[k]);
            });
            o.children.forEach(c=>{
                e.appendChild( HTMLObjectifier.Deobjectify(c) );
            });
        }
        else if (o.type === 3){
            e = document.createTextNode(o.value);
        }

        return e;
    }
}