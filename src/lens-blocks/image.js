/**
 * Created by darylcecile on 11/01/2019.
 */

Host.registerPlugin("image")

    .defineCreator((callback)=>{
        let choice = '';
        let path = '';
        let caption = '';
        Host.showTwinChoice({
            content:'Browse',
            callback:()=>{
                FileBrowser.Open((v)=>{
                    if (v === null){
                        callback();
                    }
                    else{
                        Host.showPrompt({
                            title:"Enter a caption:",
                            placeholder:'Leave empty for no caption'
                        },(val)=>{
                            if ( val === null ){
                                callback();
                            }
                            else{
                                callback(Host.$ElementMaker('<figure data-is="block" contenteditable="false"/>',[
                                    Host.$ElementMaker('<img src="' + v + '" alt="">'),
                                    Host.$ElementMaker('<figcaption contenteditable="true">' + val + '</figcaption>')
                                ]))
                            }
                        });
                    }
                });
            }
        },
        {
            content:'Upload',
            callback:()=>{
                Host.UploadFile(v=>{
                    if (v === null){
                        callback();
                    }else{
                        Host.showPrompt({
                            title:"Enter a caption:",
                            placeholder:'Leave empty for no caption'
                        },(val)=>{
                            if ( val === null ){
                                callback();
                            }
                            else{
                                callback(Host.$ElementMaker('<figure data-is="block" contenteditable="false"/>',[
                                    Host.$ElementMaker('<img src="' + v + '" alt="">'),
                                    Host.$ElementMaker('<figcaption contenteditable="true">' + val + '</figcaption>')
                                ]))
                            }
                        });
                    }
                });
            }
        });
    })

    .defineEditor((element,done)=>{

        Host.showTwinChoice({
            content:'Browse',
            callback:()=>{
                FileBrowser.Open((v)=>{
                    if (v !== null){
                        $(element).find('img').attr('src',v);
                    }
                    done();
                });
            }
        },
        {
            content:'Upload',
            callback:()=>{
                Host.UploadFile(v=>{
                    if (v !== null){
                        $(element).find('img').attr('src',v);
                    }
                    done();
                });
            }
        });

    });