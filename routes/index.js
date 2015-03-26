var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var qr = require('qr-image');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});


var db = mongoose.connect('mongodb://localhost/qr-apply');
db.connection.on('error', function(err) {
  console.log('数据库连接失败：' + err);
});
db.connection.on('open', function() {
  console.log('数据库连接成功！');
});

var ApplySchema = mongoose.Schema({
  qrId: String,
  name: String,
  mail: String,
  department: String
});
var ApplyModel = db.model('applys', ApplySchema);


var QR_FLAG = 'APPLY';
var QR_ID = 1;
var DEPARTMENT_STR = '平台事业部';

/* 生成二维码 */
router.get('/qr', function(req, res) {
  var qrPng = qr.image(QR_FLAG + ':' + QR_ID, {size: 8, margin: 2});
  console.log('生成二维码-->' + QR_ID);
  qrPng.pipe(res);
});


/* 处理扫描的结果并入库 */
function checkStr(str) {
  if (typeof str != 'undefined' && str.trim() != '') {
    return true;
  } else {
    return false;
  }
}
router.get('/handle', function(req, res) {
  var qrId = req.query.qrId;
  var name = req.query.name;
  var mail = req.query.mail;
  var department = req.query.department;
  if (!checkStr(qrId) || !checkStr(mail) || !checkStr(name) || !checkStr(department)) {
    console.log('参数-->\r\n qrId=' + qrId + '\r\n mail=' + mail + '\r\n name=' + name + '\r\n department=' + department);
    res.json({code: '400', msg: '非法参数'});
  } else if (QR_ID != qrId) {
    res.json({code: '400', msg: '无效二维码'});
  } else if (-1 === department.indexOf(DEPARTMENT_STR)) {
    res.json({code: '400', msg: '目前只支持平台事业部的同学报名'});
  } else {
    // 如果同qrId、name的已存在，默认报名成功
    ApplyModel.find({qrId: qrId, name: name}, function(err, docs) {
      if (err) {
        console.log(err);
        res.json({code: '400', msg: '系统异常'});
      } else {
        if (docs.length > 0) {
          res.json({code: '200', msg: '报名成功'});
        } else {
          // 执行创建逻辑
          ApplyModel.create({
            qrId: qrId,
            name: name,
            mail: mail,
            department: department}, function(err, doc) {
            if (err) {
              console.log(err);
              res.json({code: '400', msg: '系统异常'});
            } else {
              console.log('入库成功-->' + doc)
              res.json({code: '200', msg: '报名成功'});
            }
          });
        }
      }
    });
  }
});


/* 查询扫描结果 */
router.get('/query/:qrId', function(req, res) {
  var qrId = req.params.qrId;
  if (!checkStr(qrId)) {
    res.send('非法参数');
  }
  ApplyModel.find({qrId: qrId}, function(err, docs) {
    if (err) {
      res.send('系统异常\r\n' + err)
    } else {
      if (docs.length > 0) {
        res.render('query-result', {data: docs});
      } else {
        res.send('没有相关数据')
      }
    }
  });
});


module.exports = router;
