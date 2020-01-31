/**
 * Created by darylcecile on 11/01/2019.
 */

Host.registerPlugin("soundcloud")

    .defineCreator((callback)=>{
        Host.showPrompt({
            title:"Enter SoundCloud URL:",
            placeholder:"e.g. https://soundcloud.com/the-bugle/bugle-179-playas-gon-play"
        },(val)=>{
            if ( val === null || val.trim() === "" ){
                callback();
            }
            else{
                let ps = val.split('https://soundcloud.com/')[1].split('http://soundcloud.com/');
                let loc;
                if (ps.length === 1) loc = ps[0];
                else loc = ps[1];

                $.get(`https://assets.slantedpress.com/soundcloud/src/${ loc }`,(s)=>{
                    let src = Host.getSecuredSource(s);
                    callback( Host.secureIframe(Host.$ElementMaker(`<iframe onload="resizeIframe(this)" src="${src}" frameborder="0" scrolling="no" class="foreign"></iframe>`)) );
                });

            }
        });

    })

    .defineEditor((element,done)=>{

        let $frame = $(element).find('iframe');

        Host.showPrompt({
            title:"Enter SoundCloud url:"
        },(val)=>{
            if ( !(val === null || val.trim() === "") ){
                let ps = val.split('https://soundcloud.com/')[1].split('http://soundcloud.com/');
                let loc;
                if (ps.length === 1) loc = ps[0];
                else loc = ps[1];

                $.get(`https://assets.slantedpress.com/soundcloud/src/${ loc }`,(s)=>{
                    let src = Host.getSecuredSource(s);
                    $frame.attr('src', src );
                }).always(function() {
                    done();
                });
            }
        });
    });