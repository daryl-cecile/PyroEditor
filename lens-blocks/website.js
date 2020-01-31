/**
 * Created by darylcecile on 11/01/2019.
 */


Host.registerPlugin("website")

    .defineCreator((callback)=>{
        Host.showPrompt({
            title:"Enter URL:"
        },(val)=>{
            if ( val === null || val.trim() === "" ){
                callback();
            }
            else{
                val = Host.getSecuredSource(val);
                callback( Host.secureIframe(Host.$ElementMaker(`<iframe onload="resizeIframe(this)" src="${val}" frameborder="0" class="foreign"></iframe>`)) );
            }
        });
    })

    .defineEditor((element,done)=>{
        Host.showPrompt({
            title:"Enter URL:"
        },(val)=>{
            if ( !(val === null || val.trim() === "") ){
                val = Host.getSecuredSource(val);
                $(element).find('iframe').attr('src',val);
            }
            done();
        });
    });