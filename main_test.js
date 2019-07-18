const app = require('express')();

app.get('/', function main(request, response) {

    response.send('test 22')
  })


app.listen(4000, () => {
  console.log('The server is running on port 4000');
});