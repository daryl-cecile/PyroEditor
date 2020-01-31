/**
 * Created by darylcecile on 13/01/2019.
 */

console.log("SR");

Host.registerPlugin("quote")

    .defineCreator((callback)=>{

        Host.showPrompt({
                title:"Enter Quote:"
            },(val)=>{
                if ( val.trim() === "" ){
                    callback();
                }
                else{
                    let $element = Host.$ElementMaker(`<blockquote>${ Host.escapeHTML(val) }</blockquote>`);
                    callback($element);
                }
            }
        );

    })

    .defineEditor((element,done)=>{

        let currentContent = element.innerHTML;

        Host.showPrompt({
            title:"Enter Quote:"
        },(val)=>{
                if ( val.trim() !== "" ){
                    element.innerText = val;
                }
                done();
            }
        );

    });