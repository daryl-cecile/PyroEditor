/**
 * Created by darylcecile on 11/01/2019.
 */

Host.registerPlugin("unsplash")

    .defineCreator((callback)=>{
        let path = '';
        let caption = '';
        Host.showTwinChoice({
            content:'Search',
            callback:()=>{
                FileBrowser.OpenUnsplash((_url,_caption)=>{
                    if (_url === null || _caption === null){
                        callback();
                    }
                    else{
                        path = _url;
                        let $element = Host.$ElementMaker(`<figure data-is="block" contenteditable="false"><img src='${path}' alt=''/><figcaption>${_caption}</figcaption></figure>`);
                        callback($element);
                    }
                });
            }
        },
        {
            content:'Random',
            callback:()=>{
                $.get('https://assets.slantedpress.com/unsplash/random',function(v){
                    v = JSON.parse(v);
                    path = v.urls.raw;
                    caption = `Photo by <a href='${v.user.links.html}?utm_source=slantedpress&utm_medium=referral' target="_blank">${v.user.name}</a> on <a href="https://unsplash.com/?utm_source=slantedpress&utm_medium=referral" target="_blank">Unsplash</a>`;
                    let $element = Host.$ElementMaker(`<figure data-is="block" contenteditable="false"><img src='${path}' alt=''/><figcaption>${caption}</figcaption></figure>`);
                    callback($element);
                });
            }
        });

    })

    .defineEditor((element,done)=>{

        FileBrowser.OpenUnsplash((_url,_caption)=>{
            if ( !(_url === null || _caption === null) ){
                $(element).find('img').attr('src',_url);
                $(element).find('figcaption').html(_caption);
            }
            done();
        });

    });