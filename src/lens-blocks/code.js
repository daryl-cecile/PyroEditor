/**
 * Created by darylcecile on 11/01/2019.
 */



Host.registerPlugin("code")

    .defineCreator((callback)=>{

        Host.showAlert(
            "Enter Code Snippet:",
            "<textarea id='code-snip' style='width:100%'></textarea>",
            ()=>{
                let val = $('#code-snip', Host.document).val();
                if ( val.trim() === "" ){
                    callback();
                }
                else{
                    let $element = Host.$ElementMaker(`<pre>${ Host.escapeHTML(val) }</pre>`);
                    callback($element);
                }
            }
        );

    })

    .defineEditor((element,done)=>{

        let currentContent = element.innerHTML;

        Host.showAlert(
            "Enter Code Snippet:",
            "<textarea id='code-snip' style='width:100%'>" + currentContent + "</textarea>",
            ()=>{
                let val = $('#code-snip', Host.document).val();
                if ( val.trim() !== "" ){
                    element.innerText = val;
                }
                done();
            }
        );

    });