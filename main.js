var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var compression = require('compression');
var sanitizeHtml = require('sanitize-html');

var low = require('lowdb');
var FileSync = require('./node_modules/lowdb/adapters/FileSync');
var adapter = new FileSync('db.json');
var db = low(adapter);
db.defaults({
    books: [],
    chapters: [],
    words:[]
}).write();

var template = {
    HTML:function(title, list, body, control, authStatusU){
      return `
      <!doctype html>
      <html>
      <head>
        <title>WEB  - ${title}</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1><a href="/">vocabulary</a></h1>
        <a href="/book/list">books</a>
        <a href="/book/list">words</a><br>
        ${list}
        ${body}
        ${control}
      </body>
      </html>
      `;
    },chapterlist:function(filelist){
      var list = `<br><table border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>chspter</th></tr>`;
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
      var list = `<br><table border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>book</th><th>author</th></tr>`;
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
  bookUI:function(request, response,book_id){
    var authTopicUI =  '<br> <a href="/book/create">new book</a>'
    if(book_id){
      authTopicUI = `<br> <a href="/chapter/create/${book_id}">new chapter</a> 
      <a href="/book/update/${book_id}">update</a>
      <form action="/book/delete_process" method="post" style="display: inline-block;">
        <input type="hidden" name="id" value="${book_id}">
        <input type="submit" value="delete">
      </form>`;
    }
    return authTopicUI;
  },
  chapterUI:function(request, response,chapter_id){
    return `<br> <a href="/word/create/${chapter_id}">new word</a> 
      <a href="/chapter/update/${chapter_id}">update</a>
      <form action="/chapter/delete_process" method="post" style="display: inline-block;">
        <input type="hidden" name="id" value="${chapter_id}">
        <input type="submit" value="delete">
      </form>`;
  },
    topicUI:function(request, response, topic){
      var authTopicUI =  `<br> <a href="/topic/create">new topic</a>
          <a href="/topic/update/${topic.id}">update</a>
          <form action="/topic/delete_process" method="post" style="display: inline-block;">
            <input type="hidden" name="id" value="${topic.id}">
            <input type="submit" value="delete">
          </form>`;
      return authTopicUI;
    }
}   
var shortid = require('shortid');

var helmet = require('helmet');
var bcrypt = require('bcryptjs');
app.use(helmet())
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:false}))
app.use(compression());

 
// app.get('*',function(request, response, next){
//   // request.id = '';
//   console.log('*',request.id);
//     next()
// })

app.get('/', function (request, response) {
    var html = template.HTML('', '',
      `
      <h2></h2>Hello, Node.js`,
      '',
      ''
    );
    response.send(html)
  })

  app.get('/book/list', function (request, response) {
    var books = db.get('books').value();
    var title = '';
    var description = 'book list';
    var list = template.booklist(books);
    var html = template.HTML(title, list,
      `<h2>${title}</h2>${description}`,
      control.bookUI(request, response),
      ''
    );
    response.send(html)
  })

  app.get('/book/create', function (request, response) {
    var title = 'WEB - create';
    var list = '';
    var html = template.HTML(title, list, `
        <form action="/book/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p><input type="text" name="author" placeholder="author"></p>
          <p><input type="submit" value="create"></p>
        </form>
      `, '', '');
    response.send(html);
  })

  app.post('/book/create_process', function (request, response) {
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

  app.get('/book/:bookId', function (request, response) {
    var book = db.get('books').find({
      id: request.params.bookId
    }).value();
    var chapters = db.get('chapters').filter({
      book_id: book.id
    }).value();
    var title = '';
    var description = '';
    var list = template.chapterlist(chapters);
    var html = template.HTML(title, '',
      `<br><b>${book.title}</b> by ${book.author}
      ${list}`,
      control.bookUI(request, response, book.id),
      '' 
    );
    response.send(html)
  })

  app.get('/book/update/:bookId', function (request, response) {
    var book = db.get('books').find({id:request.params.bookId}).value();
    var title = '';
    var list = '';
    var html = template.HTML(title, list,
      `<form action="/book/update_process" method="post">
        <input type="hidden" name="id" value="${book.id}">
        <p><input type="text" name="title" placeholder="title" value="${book.title}"></p>
        <p><input type="text" name="author" placeholder="author" value="${book.author}"></p>
        <p><input type="submit" value="update"></p>
      </form>
      `,'',''
    );
    response.send(html);
  })

  app.post('/book/update_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var title = post.title;
    var author = post.author;
    var book = db.get('books').find({id:id}).value();
    db.get('books').find({id:id}).assign({
      title:title, author:author
    }).write();
    response.redirect(`/book/${book.id}`)
  })

  app.post('/book/delete_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    db.get('books').remove({id:id}).write();
    response.redirect('/book/list');
  })


  app.get('/chapter/create/:bookId', function (request, response) {
    var book = db.get('books').find({id:request.params.bookId}).value();
    var title = 'WEB - create';
    var list = '';
    var html = template.HTML(title, list, `
        <form action="/chapter/create_process" method="post">
          <input type="hidden" name="book_id" value="${book.id}">
          <p><input type="text" name="book_title" value="${book.title}" readonly></p>
          <p><input type="text" name="chapter" placeholder="chapter"></p>
          <p><input type="submit" value="create chapter"></p>
        </form>
      `, '', '');
    response.send(html);
  })

  app.post('/chapter/create_process', function (request, response) {
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

  app.get('/chapter/:chapterId', function (request, response) {
    var chapter = db.get('chapters').find({
      id: request.params.chapterId
    }).value();
    var word = db.get('words').filter({
      chapter_id: chapter.id
    }).value();
    var title = '';
    var description = '';
    var list = '';
    var html = template.HTML(title, '',
      `<br><b>${chapter.title}</b>
      ${list}`,
      control.chapterUI(request, response, chapter.id),
      '' 
    );
    response.send(html)
  })

  app.get('/word/create/:chapterId', function (request, response) {
    var chapter = db.get('chapters').find({id:request.params.chapterId}).value();
    var title = 'WEB - create';
    var list = '';
    var html = template.HTML(title, list, `
        <form action="/word/create_process" method="post">
          <input type="hidden" name="chapter_id" value="${chapter.id}">
          <p><input type="text" name="chapter_title" value="${chapter.title}" readonly></p>
          <p><input type="text" name="word" placeholder="word"></p>
          <p><textarea name="meaning" placeholder="meaning"></textarea></p>
          <p><input type="submit" value="create word"></p>
        </form>
      `, '', '');
    response.send(html);
  })

  app.post('/word/create_process', function (request, response) {
    var post = request.body;
    var chapter_id = post.chapter_id;
    var word = post.word;
    var meaning = post.meaning;
    var id = shortid.generate();
    db.get('chapters').push({
      id: id,
      word: word,
      meaning:meaning,
      chapter_id: chapter_id,
    }).write();
    response.redirect(`/chapter/${chapter_id}`);
  })



  app.get('/topic/list', function (request, response) {
    var title = '';
    var description = '';
    var list = template.list(request.list);
    var html = template.HTML(title, list,
      `<h2>${title}</h2>${description}`,
      auth.topicUI(request, response, request.list),
      ''
    );
    response.send(html)
  })

  app.get('/topic/create', function (request, response) {
    var title = 'WEB - create';
    var list = template.list(request.list);
    var html = template.HTML(title, list, `
        <form action="/topic/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p><textarea name="description" placeholder="description"></textarea></p>
          <p><input type="submit" value="create"></p>
        </form>
      `, '', ''
      );
    response.send(html);
  })
  
  app.post('/topic/create_process', function (request, response) {
    var post = request.body;
    var title = post.title;
    var description = post.description;
  
    var id = shortid.generate();
    db.get('topics').push({
      id: id,
      title: title,
      description: description,
      user_id: request.user.id
    }).write();
    response.redirect(`/topic/${id}`);
  })
  
  
  app.get('/topic/update/:pageId', function (request, response) {
    var topic = db.get('topics').find({id:request.params.pageId}).value();
    var title = topic.title;
    var description = topic.description;
    var list = template.list(request.list);
    var html = template.HTML(title, list,
      `<form action="/topic/update_process" method="post">
        <input type="hidden" name="id" value="${topic.id}">
        <p><input type="text" name="title" placeholder="title" value="${title}"></p>
        <p><textarea name="description" placeholder="description">${description}</textarea></p>
        <p><input type="submit" value="update"></p>
      </form>
      `,'',''
    );
    response.send(html);
  })
  
  app.post('/topic/update_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var title = post.title;
    var description = post.description;
    var topic = db.get('topics').find({id:id}).value();
    db.get('topics').find({id:id}).assign({
      title:title, description:description
    }).write();
    response.redirect(`/topic/${topic.id}`)
  })
  
  app.post('/topic/delete_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var topic = db.get('topics').find({id:id}).value();
    db.get('topics').remove({id:id}).write();
    response.redirect('/');
  })
  
  app.get('/topic/:pageId', function (request, response, next) {
    var topic = db.get('topics').find({
      id: request.params.pageId
    }).value();
    var user = db.get('users').find({
      id: topic.user_id
    }).value();
    
    var sanitizedTitle = sanitizeHtml(topic.title);
    var sanitizedDescription = sanitizeHtml(topic.description, {
      allowedTags: ['h1']
    });
    var list = '';
    var html = template.HTML(sanitizedTitle, list,
      `<h2>${sanitizedTitle}</h2>
      ${sanitizedDescription}
      <p>by ${user.displayName}</p>
      `,
      auth.topicUI(request, response, topic),
      ''
    );
    response.send(html);
  });

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
