/**
 * Created by darylcecile on 11/01/2019.
 */

Host.registerPlugin("slideshow")

    .defineCreator((callback)=>{

        FileBrowser.Open((v)=>{
            if (v === null){
                callback();
            }
            else{

                Host.showPrompt({
                    title:"Enter a caption for this set of images:",
                    placeholder:'Leave empty for no caption'
                },(val)=>{
                    if ( val === null ){
                        callback();
                    }
                    else{

                        let elementSet = [];

                        function unquote(s){
                            return s.replace(/'/g,"&quot;").replace(/"/g,"&quot;");
                        }

                        for(let i = 0; i < v.length; i++){
                            elementSet.push(Host.$ElementMaker('<img src="' + v[i] + '" alt="' + unquote(val) + '">'))
                        }

                        callback(Host.$ElementMaker('<figure data-is="block" contenteditable="false"/>',[
                            Host.$ElementMaker('<div class="image-set"/>',elementSet),
                            Host.$ElementMaker('<figcaption contenteditable="true">' + val + '</figcaption>')
                        ]))
                    }
                });

            }
        },true);
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