var models = require("../models");
var Sequelize = require('sequelize');

var paginate = require('../helpers/paginate').paginate;
var boolean = 0;

// Autoload el quiz asociado a :quizId
exports.load = function (req, res, next, quizId) {

    models.Quiz.findById(quizId)
    .then(function (quiz) {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('No existe ningún quiz con id=' + quizId);
        }
    })
    .catch(function (error) {
        next(error);
    });
};


// GET /quizzes
exports.index = function (req, res, next) {

    var countOptions = {};

    // Busquedas:
    var search = req.query.search || '';
    if (search) {
        var search_like = "%" + search.replace(/ +/g,"%") + "%";

        countOptions.where = {question: { $like: search_like }};
    }

    models.Quiz.count(countOptions)
    .then(function (count) {

        // Paginacion:

        var items_per_page = 10;

        // La pagina a mostrar viene en la query
        var pageno = parseInt(req.query.pageno) || 1;

        // Crear un string con el HTML que pinta la botonera de paginacion.
        // Lo añado como una variable local de res para que lo pinte el layout de la aplicacion.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        var findOptions = countOptions;

        findOptions.offset = items_per_page * (pageno - 1);
        findOptions.limit = items_per_page;

        return models.Quiz.findAll(findOptions);
    })
    .then(function (quizzes) {
        res.render('quizzes/index.ejs', {
            quizzes: quizzes,
            search: search
        });
    })
    .catch(function (error) {
        next(error);
    });
};


// GET /quizzes/:quizId
exports.show = function (req, res, next) {

    res.render('quizzes/show', {quiz: req.quiz});
};


// GET /quizzes/new
exports.new = function (req, res, next) {

    var quiz = {question: "", answer: ""};

    res.render('quizzes/new', {quiz: quiz});
};


// POST /quizzes/create
exports.create = function (req, res, next) {

    var quiz = models.Quiz.build({
        question: req.body.question,
        answer: req.body.answer
    });

    // guarda en DB los campos pregunta y respuesta de quiz
    quiz.save({fields: ["question", "answer"]})
    .then(function (quiz) {
        req.flash('success', 'Quiz creado con éxito.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, function (error) {

        req.flash('error', 'Errores en el formulario:');
        for (var i in error.errors) {
            req.flash('error', error.errors[i].value);
        }

        res.render('quizzes/new', {quiz: quiz});
    })
    .catch(function (error) {
        req.flash('error', 'Error al crear un Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = function (req, res, next) {

    res.render('quizzes/edit', {quiz: req.quiz});
};


// PUT /quizzes/:quizId
exports.update = function (req, res, next) {

    req.quiz.question = req.body.question;
    req.quiz.answer = req.body.answer;

    req.quiz.save({fields: ["question", "answer"]})
    .then(function (quiz) {
        req.flash('success', 'Quiz editado con éxito.');
        res.redirect('/quizzes/' + req.quiz.id);
    })
    .catch(Sequelize.ValidationError, function (error) {

        req.flash('error', 'Errores en el formulario:');
        for (var i in error.errors) {
            req.flash('error', error.errors[i].value);
        }

        res.render('quizzes/edit', {quiz: req.quiz});
    })
    .catch(function (error) {
        req.flash('error', 'Error al editar el Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = function (req, res, next) {

    req.quiz.destroy()
    .then(function () {
        req.flash('success', 'Quiz borrado con éxito.');
        res.redirect('/quizzes');
    })
    .catch(function (error) {
        req.flash('error', 'Error al editar el Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = function (req, res, next) {

    var answer = req.query.answer || '';

    res.render('quizzes/play', {
        quiz: req.quiz,
        answer: answer
    });
};


// GET /quizzes/:quizId/check
exports.check = function (req, res, next) {

    var answer = req.query.answer || "";

    var result = answer.toLowerCase().trim() === req.quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz: req.quiz,
        result: result,
        answer: answer
    });
};
exports.randomplay = function(req,res,next) {

    models.Quiz.findAll()
    .then(function(quizzes){

        //funcion random
        function random(){
            var random = Math.floor(Math.random()*((quizzes.length+1) - 1) + 1);
            if(req.session.quizzes.length>0){
                for (var i = 0; i < req.session.quizzes.length ; i++) {
                    if(req.session.quizzes[i] === random){
                        boolean = 1;
                        return;
                    }
                }
                boolean=0;
                    models.Quiz.findById(random)
                    .then(function(quiz){
                        res.render('quizzes/randomplay',{
                            quiz:quiz,
                            score:req.session.score
                        });
                        })
                    .catch(function (error){
                        next(error);
                    });
            } 
        }   
        if ((req.session.score < quizzes.length) || (typeof req.session.score === "undefined")) {

            //ejecucion de random
            if(typeof req.session.quizzes !== "undefined"){
                random();
                while (boolean === 1) {
                    random();
                }
            } else {
                
                var random = Math.floor(Math.random()*(quizzes.length - 1) + 1);
                req.session.quizzes = [random];
                for (var i = 0; i < quizzes.length ; i++) {
                    req.session.quizzes.push(0);
                }
                models.Quiz.findById(random)
                                    .then(function(quiz){
                                        var score = 0;
                                        req.session.score = score;
                                        res.render('quizzes/randomplay',{
                                            quiz:quiz,
                                            score:req.session.score
                                        });
                                    })
                                    .catch(function (error){
                                         next(error);
                                    });
            }

        }else{ 
            var score2 = req.session.score;
            for (var i = 0; i < req.session.quizzes.length ; i++) {
                    req.session.quizzes[i]=0;
                }
            req.session.score = 0;
            res.render('quizzes/randomnomore', {
                score:score2
            })
        }
        
    })
    .catch(function (error){
        next(error);
    });               
};
exports.randomcheck = function(req,res,next){
    var idQuiz = req.quiz.id 
    var answer = req.query.answer || '';
    var result = answer.toLowerCase().trim() === req.quiz.answer.toLowerCase().trim();
    models.Quiz.findById(idQuiz)
    .then(function(quiz){
        if(quiz){
            if(result){
                boolean = 0;
                req.session.score = req.session.score + 1;
                function rellenar(){
                     for(var i=0;i<req.session.quizzes.length - 1; i++){
                        if(req.session.quizzes[i] === 0){
                           req.session.quizzes[i]=idQuiz;
                           return;
                        }
                    }   
                }
                rellenar();
                res.render('quizzes/randomcheck', {
                quiz: quiz,
                score:req.session.score,
                answer: answer,
                result:result
            });
            } else {
                boolean = 0;
                var score2 = req.session.score;
                req.session.score = 0;
                req.session.quizzes = "undefined";
                res.render('quizzes/randomcheck', {
                quiz: quiz,
                score:score2,
                answer: answer,
                result:result
            });
            }
            
        }else{
            throw new Error ("No existe el quiz que buscas." + idQuiz);
        }
    })
    .catch(function (error){
        next(error);
    });
};
