
//buscando pagamento por ID
module.exports	=	function(app){
	const	PAGAMENTO_CRIADO	=	"CRIADO";
	const	PAGAMENTO_CONFIRMADO	=	"CONFIRMADO";
	const	PAGAMENTO_CANCELADO	=	"CANCELADO";

	app.get("/pagamentos/pagamento/:id",function(req,res)	{

		var connection = app.infra.connectionFactory();
		var pagamentoDAO = new app.infra.PagamentoDao(connection);

		var id = req.params.id;

		pagamentoDAO.buscaPorId(id,function(err,result){
			if (err){
				res.send('Erro');
				return;
			}
			res.json(result);

		});
	});

	//buscando todos os pagamentos
	app.get("/pagamentos",function(req,res)	{

		var connection = app.infra.connectionFactory();
		var pagamentoDAO = new app.infra.PagamentoDao(connection);

		pagamentoDAO.lista(function(err,result){
			if (err){
				res.send('Erro');
				return;
			}

			res.json(result);

		});
	});

	app.post("/pagamentos/pagamento",function(req,res){


		var	body	=	req.body;
    var pagamento = body['pagamento'];

    req.assert("pagamento.forma_de_pagamento",	"Forma	de	pagamento	é	obrigatória.").notEmpty();
		req.assert("pagamento.valor",	"Valor	é	obrigatório	e	deve	ser	um	decimal.").notEmpty().isFloat();
		req.assert("pagamento.moeda",	"Moeda	é	obrigatória	e	deve	ter	3	caracteres").notEmpty().len(3,3);
		var	errors	=	req.validationErrors();

    if	(errors){
		    console.log("Erros de validação encontrados");
				res.status(400).send(errors);
				return;
     }else{

       var connection = app.infra.connectionFactory();
       var pagamentoDao = new app.infra.PagamentoDao(connection);
       pagamento.status = PAGAMENTO_CRIADO;

       pagamento.data = new Date();

       pagamentoDao.salva(pagamento, function(exception, result){
				 if (exception){
					 res.status(500).send(exception);
				 }

       });

       if(pagamento.forma_de_pagamento == 'cartao'){
         console.log('Pagamento com cartao...');

         var cartoesClient = new app.servicos.CartoesClient();

         cartoesClient.autoriza(body['cartao'], function(err, request, response, retorno){
           if(err){
             console.log('Erro ao consultar o serviço de cartões.');
             res.status(400).send(err);
           }



           console.log('Retorno do serviço de cartoes: %j', retorno);

           var response = {
              dados_do_pagamento: pagamento,
              cartao: retorno,
              links:[
                {
										href:	"http://localhost:3000/pagamentos/pagamento/"	+	pagamento.id,
										rel:	"confirmar",
										method:	"PUT"
								},
								{
										href:	"http://localhost:3000/pagamentos/pagamento/"	+	pagamento.id,
										rel:	"cancelar",
										method:	"DELETE"
								}
              ]
           };
           res.status(201).send(response);

         });

       }else{
            console.log('Processando pagamento...');
            console.log(pagamento.status);
            res.location('/pagamentos/pagamento/'	+	result.insertId);
     		    pagamento.id	=	result.insertId;
            var	response	=	{
              dados_do_pagamento:	pagamento,
              links: [
                {
                        href:	"http://localhost:3000/pagamentos/pagamento/"	+	pagamento.id,
                        rel:	"confirmar",
                        method:	"PUT"
                },
                {
                        href:	"http://localhost:3000/pagamentos/pagamento/"	+	pagamento.id,
                        rel:	"cancelar",
                        method:	"DELETE"
                }
                        ]
                };
     		    res.status(201).json(response);
       }
     }
	});


	//Confirmação de pagamentos utilizando o async
	app.put("/pagamentos/pagamento/:id", function(req, res){

		var id = req.params.id;

		var connection = app.infra.connectionFactory();
		var pagamentoDAO = new app.infra.PagamentoDao(connection);

		var async = app.infra.async;

		//Atualiza o status do pagamento e consulta o pagamento alterado.

		async.series([
			function (callback){
				pagamentoDAO.atualizaPorId(PAGAMENTO_CONFIRMADO,id, function(err, result){
					if (err){
						res.status(500).json(err);
						return;
					}
					callback();
				});
			},
			function (callback){
				pagamentoDAO.buscaPorId(id,function(erroConsulta,resultadoConsulta){
					if (erroConsulta){
						res.status(500).json(erroConsulta);
						return;
					}
					res.status(200).json(resultadoConsulta);
				});
			}
		], function (err){
			res.status(500).json(err);
		});
});

//Altera status para pagamento Cancelado
	app.delete("/pagamentos/pagamento/:id", function (req, res){

		var id = req.params.id;

		var connection = app.infra.connectionFactory();
		var pagamentoDAO = new app.infra.PagamentoDao(connection);

		//Após alteração de status , consulta para verificar se status realmente foi alterado
		pagamentoDAO.atualizaPorId(PAGAMENTO_CANCELADO, id, function(err, result){
			if (err){
				res.status(500).json(err);
				return;
			}

		//Após alteração de status , consulta para verificar se status realmente foi alterado
		pagamentoDAO.buscaPorId(id,function(erroConsulta, resultadoConsulta){
			if (erroConsulta){
				res.status(500).json(erroConsulta);
				return;
			}
			res.status(200).json(resultadoConsulta);
		})

		});
	});
}
