var express = require('express')
var app = express()
app.locals.pretty = true;
app.set('view engine', 'jade')
app.set('views', './views');
app.get('/template',function(request, response){
  response.render('temp', {time:Date(), title:'jade'})
})
var bodyParser = require('body-parser');
var compression = require('compression');
var sanitizeHtml = require('sanitize-html');
var fs = require('fs');
var bcrypt = require('bcryptjs');

var session = require('express-session')
var FileStore = require('session-file-store')(session)
var flash = require('connect-flash');

app.use(session({
  //secure: true, //for https connection
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store:new FileStore()
}))
app.use(flash());

var multer  = require('multer')
var storage = multer.memoryStorage()
var upload = multer({ storage: storage })

var low = require('lowdb');
var FileSync = require('./node_modules/lowdb/adapters/FileSync');
var adapter = new FileSync('db.json');
var db = low(adapter);
db.defaults({
  books: [],
  chapters: [],
  words:[],
  users: []
}).write();

var template = {
    HTML:function(title, list, body, control, loginUI){
      return `
      <!doctype html>
      <html>
      <head>
        <title>WEB  - ${title}</title>
        <meta charset="utf-8">
      </head>
      <body>
      ${loginUI}
        <h1><a href="/">vocabulary</a></h1>
        <a href="/book/list">books</a>
        <a href="/word/all">all words</a>
        <a href="/flash">flash</a>
        <br>
        ${list}
        ${body}
        ${control}
      </body>
      </html>
      `;
    },allwordlist_span:function(filelist){
      var book = {}
      var chapter =  {}
      filelist.forEach(function (ob, i) {
        if(ob.book in book){
          book[ob.book] ++
        }else{
          book[ob.book] = 1
          book[i] = i
        }
        if(ob.book+ob.chapter in chapter){
          chapter[ob.book+ob.chapter] ++
        }else{
          chapter[ob.book+ob.chapter] = 1
          chapter[i] = i
        }
      });
      var list = `<br><table cellpadding="5" border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>book</th><th>chapter</th><th>words</th><th>meaning</th></tr>
      <tr>`;
      filelist.forEach(function (ob, i) {
        if(i in book){
          list = list + `<td rowspan=${book[ob.book]}>${ob.book}</td>`
        }
        if(i in chapter){
          list = list + `<td rowspan=${chapter[ob.book+ob.chapter]}>${ob.chapter}</td>`
        }
        list = list + `<td valign=middle><a href="/word/${ob.id}">${ob.title}</a></td>
        <td>${ob.meaning}</td>
        </tr>`;
      });
      list = list+'</table>'; 
      return list;
    },allwordlist:function(filelist){
      var list = `<br><table cellpadding="5" border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>book</th><th>chapter</th><th>words</th><th>meaning</th></tr>`;
      var i = 0;
      while((filelist) && i < filelist.length){
        list = list + `<tr><td>${filelist[i].book}</td>
        <td>${filelist[i].chapter}</td>
        <td><a href="/word/${filelist[i].id}">${filelist[i].title}</a></td>
        <td>${filelist[i].meaning}</td>
        </tr>`;
        i = i + 1;
        
      }
      list = list+'</table>'; 
      return list;
    },wordlist:function(filelist){
      var list = `<br><table  cellpadding="5" border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>words</th><th>meaning</th></tr>`;
      var i = 0;
      while((filelist) && i < filelist.length){
        list = list + `<tr>
        <td><a href="/word/${filelist[i].id}">${filelist[i].title}</a></td>
        <td>${filelist[i].meaning}</td>
        </tr>`;
        i = i + 1;
      }
      list = list+'</table>'; 
      return list;
    },chapterlist:function(filelist){
      var list = `<br> <table  cellpadding="5" border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>chapters</th></tr>`;
      var i = 0;
      while((filelist) && i < filelist.length){
        list = list + `<tr>
        <td><a href="/chapter/${filelist[i].id}">${filelist[i].title}</a></td>
        </tr>`;
        i = i + 1;
      }
      list = list+'</table>'; 
      return list;
    },
    booklist:function(filelist){
      var list = `<br><table  cellpadding="5" border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>title</th><th>author</th></tr>`;
      var i = 0;
      while((filelist) && i < filelist.length){
        list = list + `<tr>
        <td><a href="/book/${filelist[i].id}">${filelist[i].title}</a></td>
        <td>${filelist[i].author}</td>
        </tr>`;
        i = i + 1;
      }
      list = list+'</table>'; 
      return list;
    }
  }
var control = {
  loginUI:function(request, response){
    var authStatusUI = '<a href="/login">login</a> | <a href="/register">Register</a>'
    if(request.user){
      authStatusUI = `${request.user.displayName}|<a href="/logout">logout</a>`;
    }
    return authStatusUI;
  },
  bookUI:function(request, response,book_id){
    var authTopicUI =  '<br> <a href="/book/create">new book</a>'
    if(book_id){
      authTopicUI = `<br> <a href="/chapter/create/${book_id}">+chapter</a> 
      <a href="/book/update/${book_id}">edit</a>
      <form action="/book/delete_process" method="post" style="display: inline-block;">
        <input type="hidden" name="id" value="${book_id}">
        <input type="submit" value="delete">
      </form>`;
    }
    return authTopicUI;
  },
  chapterUI:function(request, response,chapter){
    return `<br> <a href="/word/create/${chapter.id}">+word</a> 
      <a href="/chapter/update/${chapter.id}">rename</a>
      <form action="/chapter/delete_process" method="post" style="display: inline-block;">
        <input type="hidden" name="id" value="${chapter.id}">
        <input type="hidden" name="book_id" value="${chapter.book_id}">
        <input type="submit" value="delete">
      </form>
      <br> 
      <form action="/word/import" method="POST" enctype="multipart/form-data" style="display: inline-block;">
      <input type="file" name="myfile" accept="text/*" onchange="this.form.submit()">
      <input type="hidden" name="chapter_id" value="${chapter.id}">
      </form>`;
  },
  wordUI:function(request, response, word){
    return `<br> 
      <a href="/word/update/${word.id}">edit</a>
      <form action="/word/delete_process" method="post" style="display: inline-block;">
        <input type="hidden" name="id" value="${word.id}">
        <input type="hidden" name="chapter_id" value="${word.chapter_id}">
        <input type="submit" value="delete">
      </form>
      <br> 
      `;
  }
}   
var shortid = require('shortid');

var helmet = require('helmet');
app.use(helmet())
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:false}))
app.use(compression());
  

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

    app.use(passport.initialize())
    app.use(passport.session())

    passport.serializeUser(function (user, done) {
        done(null, user.id)
    });

    passport.deserializeUser(function (id, done) {
        var user = db.get('users').find({ id: id }).value();
        done(null, user);
    });

    passport.use(new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'pwd'
        },
        function (email, password, done) {
            var user = db.get('users').find({ email: email }).value();
            if (user) {
                bcrypt.compare(password, user.password, function(err, result){
                    if(result){
                        return done(null, user, {
                            message: 'Welcome'
                        });
                    }else{
                        return done(null, false, {
                            message: 'Invalid password'
                        });
                    };
                })
                
            } else {
                return done(null, false, {
                    message: 'Invalid email'
                });
            }
        }
    ));



app.get('/', function main(request, response) {
  var fmsg = request.flash();
  var feedback = '';
  if (fmsg.success) {
    feedback = fmsg.success[0];
  }
    var html = template.HTML('', '',
      `
      <div style="color:red;"> ${feedback}</div>
      <h2>Hello</h2>`,
      '',
      control.loginUI(request,response)
    );
    response.send(html)
  })

  app.get('/flash', function flash(request, response){
    console.log('request.originalUrl:',request.originalUrl);
    console.log('request.originalUrl:',request.path);
    request.flash('test', 'test flash')
    request.flash('returnto', request.path )
    response.redirect('/flash_display');
  })

  app.get('/flash_display',function flash_display(request, response){
    var fmsg = request.flash();
    message = fmsg.test;
    backtopage = fmsg.returnto;
    console.log(message);
    
    response.redirect(backtopage)
  })
  app.get('/book/list', function book_list(request, response) {
    var books = db.get('books').value();
    var title = '';
    var description = '';
    var list = template.booklist(books);
    var html = template.HTML(title, list,
      `<h2>${title}</h2>${description}`,
      control.bookUI(request, response),
      control.loginUI(request, response)
    );
    response.send(html)
  })

  app.get('/book/create', function book_new(request, response) {
    if (!request.user) {
      request.flash('info', 'please login')
      response.redirect('/login');
      return false;
    }
    var title = 'WEB - create';
    var books = db.get('books').value();
    var list = template.booklist(books);
    var html = template.HTML(title, '', 
      `${list}
        <form action="/book/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p><input type="text" name="author" placeholder="author"></p>
          <p><input type="submit" value="create"></p>
        </form>
      `, '', control.loginUI(request, response));
    response.send(html);
  })

  app.post('/book/create_process', function book_new_p(request, response) {
    var post = request.body;
    var title = post.title;
    var author = post.author;
    var id = shortid.generate();
    db.get('books').push({
      id: id,
      title: title,
      author: author,
    }).write();
    response.redirect(`/book/list`);
  })

  app.get('/book/:bookId', function books(request, response) {
    var book = db.get('books').find({id: request.params.bookId}).value();
    var chapters = db.get('chapters').filter({book_id: book.id}).value();
    var title = '';
    var description = '';
    var list = template.chapterlist(chapters);
    var html = template.HTML(title, '',
      `<br><a href="/book/${book.id}">${book.title}</a> by ${book.author}
      ${list}`,
      control.bookUI(request, response, book.id),
      control.loginUI(request, response) 
    );
    response.send(html)
  })

  app.get('/book/update/:bookId', function book_edit(request, response) {
    var book = db.get('books').find({id:request.params.bookId}).value();
    var title = '';
    var list = '';
    var html = template.HTML(title, list,
      `<br><a href="/book/${book.id}">${book.title}</a>
      <form action="/book/update_process" method="post">
        <input type="hidden" name="id" value="${book.id}">
        <p><input type="text" name="title" placeholder="title" value="${book.title}"></p>
        <p><input type="text" name="author" placeholder="author" value="${book.author}"></p>
        <p><input type="submit" value="update"></p>
      </form>
      `,'',control.loginUI(request, response)
    );
    response.send(html);
  })

  app.post('/book/update_process', function book_edit_p(request, response) {
    var post = request.body;
    var id = post.id;
    var title = post.title;
    var author = post.author;
    db.get('books').find({id:id}).assign({title:title, author:author}).write();
    response.redirect(`/book/${id}`)
  })

  app.post('/book/delete_process', function book_del_p(request, response) {
    // hold !!!
    console.log('need to check if there are chapters and word included');
    var post = request.body;
    var id = post.id;
    //db.get('books').remove({id:id}).write();
    response.redirect(`/book/${id}`);
  })


  app.get('/chapter/create/:bookId', function chap_new(request, response) {
    if (!request.user) {
      request.flash('info', 'please login')
      response.redirect('/login');
      return false;
    }
    var book = db.get('books').find({id:request.params.bookId}).value();
    var chapters = db.get('chapters').filter({book_id: book.id}).value();
    var title = 'WEB - create';
    var list = template.chapterlist(chapters);
    var html = template.HTML(title, '', `
    <br><a href="/book/${book.id}">${book.title}</a> by ${book.author}
    ${list}
        <form action="/chapter/create_process" method="post">
          <input type="hidden" name="book_id" value="${book.id}">
          <p><input type="text" name="chapter" placeholder="chapter"></p>
          <p><input type="submit" value="create chapter"></p>
        </form>
      `, '', control.loginUI(request, response));
    response.send(html);
  })

  app.post('/chapter/create_process', function chap_new_p(request, response) {
    var post = request.body;
    var book_id = post.book_id;
    var chapter = post.chapter;
    var id = shortid.generate();
    db.get('chapters').push({
      id: id,
      title: chapter,
      book_id: book_id,
    }).write();
    response.redirect(`/book/${book_id}`);
  })

  app.get('/chapter/:chapterId', function chapters(request, response) {
    var chapter = db.get('chapters').find({id: request.params.chapterId}).value();
    var word = db.get('words').filter({chapter_id: chapter.id}).value();
    var book = db.get('books').find({id: chapter.book_id}).value();
    var title = '';
    var description = '';
    var list = template.wordlist(word);
    //var sanitizedTitle = sanitizeHtml(topic.title);
    var html = template.HTML(title, '',
      `<br><a href="/book/${book.id}">${book.title}</a> > 
      <a href="/chapter/${chapter.id}">${chapter.title}</a>
      ${list}`,
      control.chapterUI(request, response, chapter),
      control.loginUI(request, response) 
    );
    response.send(html)
  })

  app.get('/chapter/update/:chapterId', function chap_edit(request, response) {
    var chapter = db.get('chapters').find({id:request.params.chapterId}).value();
    var book = db.get('books').find({id: chapter.book_id}).value();
    var title = '';
    var list = '';
    var html = template.HTML(title, list,
      `<br><a href="/book/${book.id}">${book.title}</a> > 
      <a href="/chapter/${chapter.id}">${chapter.title}</a>
      <form action="/chapter/update_process" method="post">
        <input type="hidden" name="id" value="${chapter.id}">
        <p><input type="text" name="title" placeholder="chapter title" value="${chapter.title}"></p>
        <p><input type="submit" value="update"></p>
      </form>
      `,'',control.loginUI(request, response)
    );
    response.send(html);
  })
 
  app.post('/chapter/update_process', function chap_edit(request, response) {
    var post = request.body;
    var id = post.id;
    var title = post.title;
    db.get('chapters').find({id:id}).assign({title:title}).write();
    response.redirect(`/chapter/${id}`)
  })

  app.post('/chapter/delete_process', function chap_del_p(request, response) {
    // hold !!!!11
    console.log('!!!!!! need to check if there existing word');
    var post = request.body;
    var id = post.id;
    var book_id = post.book_id
    //db.get('chapters').remove({id:id}).write();
    response.redirect(`/chapter/${id}`);
  })

 
  app.get('/word/create/:chapterId', function word_new(request, response) {
    if (!request.user) {
      request.flash('info', 'please login')
      response.redirect('/login');
      return false;
    }
    var chapter = db.get('chapters').find({id:request.params.chapterId}).value();
    var word = db.get('words').filter({chapter_id: chapter.id}).value();
    var book = db.get('books').find({id:chapter.book_id}).value();
    var title = 'WEB - create';
    var list = template.wordlist(word);
    var html = template.HTML(title, '', 
    `<br><a href="/book/${book.id}">${book.title}</a> > 
    <a href="/chapter/${chapter.id}">${chapter.title}</a>
    ${list}
        <form action="/word/create_process" method="post">
          <input type="hidden" name="chapter_id" value="${chapter.id}">
          <p><input type="text" name="word" placeholder="word"></p>
          <p><textarea name="meaning" placeholder="meaning"></textarea></p>
          <p><input type="submit" value="create word"></p>
        </form>
      `, '', control.loginUI(request, response));
    response.send(html);
  })

  app.post('/word/create_process', function word_new_p(request, response) {
    var post = request.body;
    var chapter_id = post.chapter_id;
    var word = post.word;
    var meaning = post.meaning;
    var id = shortid.generate();
    db.get('words').push({
      id: id,
      title: word,
      meaning:meaning,
      chapter_id: chapter_id,
    }).write();
    response.redirect(`/chapter/${chapter_id}`);
  })

  app.post('/word/import', upload.single('myfile'), function word_open(request, response) {
    var post = request.body; 
    var chapter_id = post.chapter_id
    var data = request.file.buffer.toString('utf8').trim().split('\r\n')
    var i = 0;
    while((data.length) && i < data.length){
      var id = shortid.generate();
      db.get('words').push({
        id: id,
        title: data[i],
        meaning:'',
        chapter_id: chapter_id,
      }).write();
      i = i + 1
    }
    response.redirect(`/chapter/${chapter_id}`);
  })

  app.get('/word/all', function wordall(request, response) {
    var book = db.get('books').value();
    var i,j,k;
    var wordlist = []
    for(i = 0; i<book.length; i++){
      var chapter = db.get('chapters').filter({book_id: book[i].id}).value();
      for(j = 0; j<chapter.length; j++){
        word = db.get('words').filter({chapter_id: chapter[j].id}).value();
        for(k=0;k<word.length;k++){
          word[k].chapter = chapter[j].title;
          word[k].book = book[i].title;
        }
        wordlist = wordlist.concat(word)
      }
    }
    var title = '';
    var description = '';
    var list = template.allwordlist_span(wordlist);
    //var sanitizedTitle = sanitizeHtml(topic.title);
    var html = template.HTML(title, '',
      `<br>
      ${list}
      <br>
      `,
      '',
      control.loginUI(request, response) 
    );
    response.send(html)
  })

  app.get('/word/:wordId', function words(request, response) {
    var word = db.get('words').find({id: request.params.wordId}).value();
    var chapter = db.get('chapters').find({id: word.chapter_id}).value();
    var book = db.get('books').find({id: chapter.book_id}).value();
    var title = '';
    var description = '';
    var list = '';
    //var sanitizedTitle = sanitizeHtml(topic.title);
    var html = template.HTML(title, '',
      `<br><a href="/book/${book.id}">${book.title}</a> > 
      <a href="/chapter/${chapter.id}">${chapter.title}</a> >
      <a href="/word/${word.id}">${word.title}</a>
      <br>
      <br>
      ${word.title} : ${word.meaning}
      <br>`,
      control.wordUI(request, response, word),
      control.loginUI(request, response) 
    );
    response.send(html)
  })

  app.get('/word/update/:wordId', function word_edit(request, response) {
    var word = db.get('words').find({id: request.params.wordId}).value();
    var chapter = db.get('chapters').find({id: word.chapter_id}).value();
    var book = db.get('books').find({id: chapter.book_id}).value();
    var title = '';
    var list = '';
    
    var html = template.HTML(title, list,
      `<br><a href="/book/${book.id}">${book.title}</a> > 
      <a href="/chapter/${chapter.id}">${chapter.title}</a> >
      <a href="/word/${word.id}">${word.title}</a>
      <br>
      <form action="/word/update_process" method="post">
          <input type="hidden" name="id" value="${word.id}">
          <input type="hidden" name="chapter_id" value="${word.chapter_id}">
          <p><input type="text" name="title" placeholder="word" value="${word.title}"></p>
          <p><textarea name="meaning" placeholder="meaning">${word.meaning}</textarea></p>
          <p><input type="submit" value="update"></p>
        </form>
      `,'',control.loginUI(request, response)
    );
    response.send(html);
  })
 
  app.post('/word/update_process', function word_edit_p(request, response) {
    var post = request.body;
    var id = post.id;
    var chapter_id = post.chapter_id
    var title = post.title;
    var meaning = post.meaning;
    db.get('words').find({id:id}).assign({title:title,meaning:meaning}).write();
    response.redirect(`/chapter/${chapter_id}`)
  })

  app.post('/word/delete_process', function word_del_p(request, response) {
    var post = request.body;
    var id = post.id;
    var chapter_id = post.chapter_id
    db.get('words').remove({id:id}).write();
    response.redirect(`/chapter/${post.chapter_id}`);
})



app.get('/login', function user_login(request, response) {
  var fmsg = request.flash();
  var feedback = '';
  if (fmsg.error) {
    feedback = fmsg.error[0];
  } else if(fmsg.info){
    feedback = fmsg.info[0]
  }

  var title = 'WEB - login';
  var list = '';
  var html = template.HTML(title, list, `
<div style="color:red;">${feedback}</div>
<form action="/login_process" method="post">
<p><input type="text" name="email" placeholder="email" value="test@gmail.com"></p>
<p><input type="password" name="pwd" placeholder="password" value="111111"></p>
<p>
<input type="submit" value="login">
</p>
</form>
`, '' ,control.loginUI(request, response));
  response.send(html);
})


app.post('/login_process', passport.authenticate('local', {
  failureFlash: true,
  successFlash: true,
  successRedirect: '/',
  failureRedirect: '/login'
}));

app.get('/register', function user_signup(request, response) {
  var fmsg = request.flash();
  var feedback = '';
  if (fmsg.success) {
    feedback = fmsg.success[0];
  }

var title = 'WEB - register';
var list = '';
var html = template.HTML(title, list, `
<div style="color:red;">${feedback}</div>
<form action="/register_process" method="post">
<p><input type="text" name="email" placeholder="email" value="test2@gmail.com"></p>
<p><input type="password" name="pwd" placeholder="password" value="111111"></p>
<p><input type="password" name="pwd2" placeholder="password" value="111111"></p>
<p><input type="text" name="displayName" placeholder="display name" value="tester2"></p>
<p><input type="submit" value="register"></p>
</form>
`, '',control.loginUI(request, response));
response.send(html);
})

app.post('/register_process', function user_signup_p(request, response) {
// todo : validation
// check email duplicaation check
// check if pwd,pwd2 are same
var post = request.body;
var email = post.email;
var pwd = post.pwd;
var pwd2 = post.pwd2;
var displayName = post.displayName;
if(pwd !== pwd2){
  request.flash('error','password must same!');
  response.redirect('/auth/register');
}else{
  bcrypt.hash(pwd, 10, function(err, hash) {
    console.log('hash',hash);
    var user = {
      id:shortid.generate(),
      email:email,
      password:hash,
      displayName:displayName
    }
      db.get('users').push(user).write();
      request.login(user, function(err){
        console.log('redirect');
        return response.redirect('/');
      })
});


  }
});

app.get('/logout', function user_logout(request, response) {
request.logout();
response.redirect('/');
})




app.use(function(req, res, next){
  res.status(404).send('sorry cant find that!')
})

app.use(function(err,req,res,nex){
  console.error(err.stack)
  res.status(500).send('Something broke!')
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!')
})
