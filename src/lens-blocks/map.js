/**
 * Created by darylcecile on 11/01/2019.
 */


Host.registerPlugin("map")

    .defineCreator((callback)=>{
        Host.showPrompt({
            title:"Enter a Location:"
        },(val)=>{
            if ( val === null || val.trim() === "" ){
                callback();
            }
            else{
                let src = Host.getSecuredSource(`https://maps.google.com/maps?q=${ encodeURI(val) }&t=&z=13&ie=UTF8&iwloc=&output=embed`);
                let frame = Host.$ElementMaker(`<iframe data-loc="${val}" onload="resizeIframe(this)" class="foreign" id="gmap_canvas" src="${src}" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"></iframe>`);
                callback(Host.secureIframe(frame));
            }
        });
    })

    .defineEditor((element,done)=>{

        let $frame = $(element).find('iframe');
        let loc = $frame.attr('data-loc');

        Host.showPrompt({
            title:"Enter a Location:",
            defaultText: loc
        },(val)=>{
            if ( !(val === null || val.trim() === "") ){
                let src = Host.getSecuredSource(`https://maps.google.com/maps?q=${ encodeURI(val) }&t=&z=13&ie=UTF8&iwloc=&output=embed`);
                $frame.attr('src', src );
                $frame.attr('data-loc',val);
            }
            done();
        });

    });