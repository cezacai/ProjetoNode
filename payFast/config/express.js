var	express	=	require('express');
var	load	=	require('express-load');
var	bodyParser =	require('body-parser'); //faz a aplicação receber dados no corpo da requisição
var validator = require ('express-validator');

/*
Comentários
app - envia o express para as outras camadas da aplicação
express load -  carregas as config do express na pasta controller , {cwd} faz buscar a pasta controlle somente dentro da pasta app
body-parse - adiciona o objeto do express a possibilidade de fazer o parse nos formatos json e urlenconded
*/

module.exports	=	function()	{
	var app	= express();

	app.use(bodyParser.urlencoded({extended:true}));
	app.use(bodyParser.json());
	app.use(validator());

	load('controllers',	{cwd:	'app'})
	.then("infra")
	.then("servicos")
	.into(app);
	return	app;
}
