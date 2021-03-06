/* globals describe: false, it: false */
"use strict";

var JT = require('../lib/treechecker'),
    assert = require('assert');

var e = JT.make_error,
    module = describe,
    test = it,
    deepEqual = assert.deepEqual;


function number(sign, int, dec, exp, start, end) {
    return {
        '_name' : 'number',
        '_start': start,
        '_end'  : end,
        'sign'  : sign,
        'integer': int,
        'decimal': dec,
        'exponent': exp
    };
}

function keyword(value, start, end) {
    return {
        '_name': 'keyword',
        '_start': start,
        '_end'  : end,
        'value': value
    };
}

function keyval(key, val, start, end) {
    return {
        '_name' : 'key/val pair',
        '_start': start,
        '_end'  : end,
        'key'   : key,
        'value' : val,
        'colon' : ':'
    };
}

module("treechecker", function() {

    // i -> in, o -> out
    // n -> number, k -> keyword, c -> char, s -> string, a -> array, o -> object
    var in1 = number(null, ['3', '1'], null, null),
        in2 = number(null, ['0'], null, null),
        in4 = number(null, ['8'], null, {'_name': 'exponent', 'letter': 'e', 'sign': '+', 'power': ['8', '7', '2']}, [2,4], [2,10]),
        in5 = number('-', ['2'], null, {'_name': 'exponent', 'letter': 'e', 'sign': '-', 'power': ['5', '6', '4']}, [1,7], [1,14]),
        ik1 = keyword('true'),
        ik2 = keyword('false'),
        ik3 = keyword('null'),
        ic1 = {'_name': 'character', '_start': null, 'value': 'c'},
        ic3 = {'_name': 'escape', '_start': null, 'open': '\\', 'value': 'n'},
        ic5 = {'_name': 'unicode escape', '_start': null, 'open': '\\u', 'value': ['0', '0', '6', '4']},
        is1 = {'_name': 'string', '_start': [3,8], 'open': '"', 'close': '"', 'value': [ic1, ic3, ic5]},
        ia1 = {'_name': 'array' , '_start': null, 'body': null},
        ia2 = {'_name': 'array' , '_start': null, 'body': [in1, [[null, ik2]]]},
        ia3 = {'_name': 'array' , '_start': null, 'body': [ia1, []]},
        ia4 = {'_name': 'array' , '_start': null, 'body': [in4, [[null, in5]]]},
        io1 = {'_name': 'object', '_start': null, 'body': null},
        io2 = {'_name': 'object', '_start': null, 'body': [keyval(is1, io1), []]},
        io3 = {'_name': 'object', '_start': null, 'body': [keyval(is1, in4), []]},
        io4 = {'_name': 'object', '_start': null, 'body': [keyval(is1, in1), [[null, keyval(is1, io1)]]]};
    
    test("simple number", function() {
        deepEqual(JT.t_value(in1),
                  JT.ret_err([], 31));
        deepEqual(JT.t_value(in2),
                  JT.ret_err([], 0));
        deepEqual(JT.t_value(in4),
                  JT.ret_err([e('number', 'overflow', '8e+872', [2,4])],
                             Infinity));
        deepEqual(JT.t_value(in5),
                  JT.ret_err([e('number', 'possible underflow', '-2e-564', [1,7])],
                             0));
    });
    
    test("keyword", function() {
        deepEqual(JT.t_value(ik1),
                  JT.ret_err([], true));
        deepEqual(JT.t_value(ik2),
                  JT.ret_err([], false));
        deepEqual(JT.t_value(ik3),
                  JT.ret_err([], null));
    });
    
    test("character", function() {
        deepEqual(JT.t_char(ic1), 'c');
        deepEqual(JT.t_char(ic3), '\n');
        deepEqual(JT.t_char(ic5), 'd');
    });
    
    test("string", function() {
        deepEqual(JT.t_value(is1),
                  JT.ret_err([], 'c\nd'));
    });
    
    test("array", function() {
        deepEqual(JT.t_value(ia1),
                  JT.ret_err([], []));
        deepEqual(JT.t_value(ia2),
                  JT.ret_err([], [31, false]));
        deepEqual(JT.t_value(ia3),
                  JT.ret_err([], [[]]));
        deepEqual(JT.t_value(ia4),
                  JT.ret_err([e('number', 'overflow', '8e+872', [2,4]),
                              e('number', 'possible underflow', '-2e-564', [1,7])],
                              [Infinity, 0]));
    });
    
    test("object", function() {
        deepEqual(JT.t_value(io1),
                  JT.ret_err([], {}));
        deepEqual(JT.t_value(io2),
                  JT.ret_err([], {'c\nd': {}}));
        deepEqual(JT.t_value(io3),
                  JT.ret_err([e('number', 'overflow', '8e+872', [2,4])],
                             {'c\nd': Infinity}));
        deepEqual(JT.t_value(io4),
                  JT.ret_err([e('object', 'duplicate key', 'c\nd', [[3,8], [3,8]])],
                             {'c\nd': 31}));
    });
    
    test("top-level: object or array", function() {
        var message = 'top-level element should be object or array';
        function makeJson(obj) {
            return {'value': obj, '_start': [1, 3], '_name': 'json'};
        }
        deepEqual(JT.t_json(makeJson(in4)),
                  JT.ret_err([e('number', 'overflow', '8e+872', [2,4]),
                              e('json', message, '', [1,3])],
                             Infinity));
        deepEqual(JT.t_json(makeJson(ik1)),
                  JT.ret_err([e('json', message, '', [1,3])], true));
        deepEqual(JT.t_json(makeJson(is1)),
                  JT.ret_err([e('json', message, '', [1,3])], 'c\nd'));
        deepEqual(JT.t_json(makeJson(ia1)),
                  JT.ret_err([], []));
        deepEqual(JT.t_json(makeJson(io1)),
                  JT.ret_err([], {}));
    });
    
});

