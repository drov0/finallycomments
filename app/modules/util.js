module.exports.urlString = () => {
    let string = ''
    let allowedChars = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 32; i++){
      string += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
    }
    return string;
}

module.exports.isAuthenticated = (req, res, next) => {
  if (req.session.steemconnect)
      return next();

  res.redirect('/');
}

module.exports.splitQueryString = (string) => {
   let allParams = string.split('&');

   let map =  allParams.map(value => {
       let item = value.split('=');
       return [item[0], item[1]];
   })

   return map.reduce((obj, item) => {
     obj[item[0]] = item[1]
     return obj
   }, {})
}
