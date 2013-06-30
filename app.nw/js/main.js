/* Main javascript  */
var fs   = require('fs');
var http = require('http');
var url = require('url');
var qs = require('querystring');
var rl = require('readline');
var path = require("path");
function httppost(pUrl,headers,body,onResponse,extra) {
    var args = url.parse(pUrl);
    //console.log(args);
    var options = args;
    if(headers)options.headers = headers;
    options.method = 'PUT';
    if(!body)options.method = 'GET';
    
    if(body){
        body = qs.stringify(body);
        options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    //console.log(options);
    var req = http.request(options, function(res) {
         //if(res.statusCode!=200){
         //      onResponse(res);
          //     return;
          //}
          var body = new Buffer(1024*10);
          var size = 0;
          res.on('data', function (chunk) {
            size+=chunk.length;
            if(size>body.length){//每次扩展10kb
                var ex = Math.ceil(size/(1024*10));
                var tmp = new Buffer(ex * 1024*10);
                body.copy(tmp);
                body = tmp;
            }
            chunk.copy(body,size - chunk.length);
          });
          res.on('end', function () {
            res.data = new Buffer(size);
            body.copy(res.data);
            res.body = res.data.toString();
            onResponse(res);
          });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
    if(body){
        req.write(body);
    }
    if(extra){
        req.write(extra);
    }
    req.end();
}

function httpget(pUrl,headers,onResponse) {
    httppost(pUrl,headers,null,onResponse);
}



var App=function(options){
    if(options==undefined) options={"dev":"","pro":"","test":"","global":""};
    var self = this;
    if(options["use_smart_host"]==undefined){
        options["use_smart_host"]=true;
    }
    if(options["urlSmartHost"]==undefined){
        options["urlSmartHost"]="http://smarthosts.googlecode.com/svn/trunk/hosts";
    }
    self.db_path =  path.dirname(location.href.replace("file://",""))+"/data.db";
    self.env = "pro";
    self.textGlobal = ko.observable(options.global);
    self.textDev = ko.observable(options.dev);
    self.textTest = ko.observable(options.test);
    self.textPro = ko.observable(options.pro);
    self.urlSmartHost = ko.observable(options.urlSmartHost);
    self.checked = ko.observable(options.use_smart_host);
    self.toTest=function(){
        console.log("to Test");
        self.env="test";
    }
    self.toDev = function(){
        console.log("to Dev");
        self.env = "dev";
    }
    self.toPro = function(){
        console.log("to Pro");
        self.env = "pro";
    }
    self.checked=ko.observable(true);
    self.switchCheck = function(){
        /**
        setTimeout(function(){
            //var checked = self.checked();

            //if(chec)
        },50);
        */
        return true;
    }
    self.getDynamic = function(){
       

        if(self.env == "test"){

            return self.textTest();
        }   
        if(self.env =="dev"){
            return  self.textDev();
        }
        if(self.env == "pro"){
            return  self.textPro();
        }
    }
    self.log=function(line){
        console.log(line);
    }
    self.msgbox =function(msg){
        $("#myModal").html(
              $("#myModal").html().replace(/\$msg/g,msg)
        );
        $("#myModal").modal("show");
    }
    self.save = function(){

        if(self.checked()){
            console.log(self.urlSmartHost());
            httpget(self.urlSmartHost(),{},function(res){
                var content="";
                var extra_msg = "";
                if(res.statusCode!=200){
                    self.log("Smart Host 网址错误!");
                    content =self.textGlobal() + "\n"+self.getDynamic()+"\n";
                    extra_msg = "<br>smarthost网址错误，并未加载";
                }else{
                    content =self.textGlobal() + "\n"+self.getDynamic()+"\n"+res.body;
                }
                fs.writeFile("/etc/hosts",content,function(err){
                    if(err){
                        self.msgbox("写入文件失败,<br>请确保/etc/hosts文件可写.<br>您可以执行一下:<br><pre>sudo chmod a+w /etc/hosts</pre>");
                        self.log("写入文件失败"+err);
                    }else{
                        //alert("写入成功");
                        //现在把所有值记到当前的包里面;
                        self.syncDb();
                        self.msgbox("已经保存"+extra_msg+"<br>2秒后窗口会自动关闭");
                        setTimeout(function(){
                            $("#myModal").modal("hide");
                        },2500);
                    }
                });
                //console.log(content);
            });
        }else{
            var  content =self.textGlobal() + "\n"+self.getDynamic()+"\n";
            fs.writeFile("/etc/hosts",content,function(err){
                    if(err){
                        self.msgbox("写入文件失败,<br>请确保/etc/hosts文件可写.<br>您可以执行一下:<br><pre>sudo chmod a+w /etc/hosts</pre>");
                        self.log("写入文件失败"+err);
                    }else{
                        //alert("写入成功");
                        //现在把所有值记到当前的包里面;
                        self.syncDb();
                        self.msgbox("已经保存"+"<br>2秒后窗口会自动关闭");
                        setTimeout(function(){
                            $("#myModal").modal("hide");
                        },2500);
                    }
                });
        }
    }
    self.syncDb = function(){
        var data = {};
        data["textGlobal"]=self.textGlobal();
        data["textTest"]=self.textTest();
        data["textPro"]=self.textPro();
        data["textDev"]=self.textDev();
        data["urlSmartHost"]=self.urlSmartHost();
        data["checked"]=self.checked();
        data["env"]=self.env;
        fs.writeFile(self.db_path,JSON.stringify(data),function(err){
            console.log(err);
        });
    }
    self.loadFromData = function(){
        var jsonString = fs.readFileSync(self.db_path);
        var data = JSON.parse(jsonString);
        self.textGlobal(data["textGlobal"]);
        self.textDev(data["textDev"]);
        self.textPro(data["textPro"]);
        self.textTest(data["textTest"]);
        self.urlSmartHost(data["urlSmartHost"]);
        //console.log("load from "+data["env"]);
        $("#to"+data["env"]).click();
        if(data["checked"]){
            self.checked(true);
        }else{
            self.checked(false);
        }
        //self.checked(data["text"])
    }
    return self;
}
$(document).ready(
    function(){
        var rootApp = new App();
        window.rootApp=rootApp;
        ko.applyBindings(rootApp, $("#wrap")[0]);
        rootApp.loadFromData();
        window.ondragover = function(e) { e.preventDefault(); return false };
        window.ondrop = function(e) { e.preventDefault(); return false };
    }
);
$(document).keydown(function (evt) {
    console.log(evt.keyCode);
    if(evt.keyCode==27){
        $("#myModal").modal("hide");
    }
if(evt.metaKey || evt.ctrlKey) {
if (evt.keyCode === 83) {
    $("textarea").blur();
    $("input").blur();
    setTimeout(function(){
        rootApp.save();
    },100);
}
}
});