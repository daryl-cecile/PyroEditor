/**
 * Created by darylcecile on 11/01/2019.
 */

Host.registerPlugin("youtube")

    .defineCreator((callback)=>{
        Host.showPrompt({
            title:"Enter Youtube Link:"
        },(val)=>{
            if ( val === null || val.trim() === "" ){
                callback();
            }
            else{
                let videoPath = "https://assets.slantedpress.com/yt/direct/" + ((url) => {
                        let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                        let match = url.match(regExp);

                        if (match && match[2].length === 11) {
                            return match[2];
                        } else {
                            return 'MtN1YnoL46Q';
                        }
                    })(val);

                $.get(videoPath,function(e){

                    e = Host.getSecuredSource(e);

                    let iframe = Host.$ElementMaker(`<iframe src='${e}' class="foreign"></iframe>`);
                    iframe.attr({
                        "onload":"resizeIframe(this)",
                        "frameborder":"0",
                        "allow":"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture",
                        "allowfullscreen":""
                    });
                    callback(Host.secureIframe(iframe));

                }).fail(function(){
                    callback();
                    Host.eventHook("ERROR",new Error("Unable to get video"));
                });

            }
        });
    })

    .defineEditor((element,done)=>{

        Host.showPrompt({
            title:"Enter Youtube Link:"
        },(val)=>{
            if ( !(val === null || val.trim() === "") ){
                let videoPath = "https://assets.slantedpress.com/yt/direct/" + ((url) => {
                        let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                        let match = url.match(regExp);

                        if (match && match[2].length === 11) {
                            return match[2];
                        } else {
                            return 'MtN1YnoL46Q';
                        }
                    })(val);

                $.get(videoPath,function(e){
                    e = Host.getSecuredSource(e);
                    $(element).find('iframe').attr('src',e);
                }).fail(function(){
                    Host.eventHook("ERROR",new Error("Unable to get video"));
                }).always(function(){
                    done();
                });

            }
        });

    });