(function() {
  'use strict';
  var soap;

  soap = require('soap');

  module.exports = function(ndx) {
    var callbacks, cleanNo, cleanNos, fillTemplate, safeCallback, url;
    url = process.env.SMS_API_URL || 'https://www.24x2.com/wssecure/service.asmx?WSDL';
    callbacks = {
      send: [],
      error: []
    };
    safeCallback = function(name, obj) {
      var cb, i, len, ref, results;
      ref = callbacks[name];
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        cb = ref[i];
        results.push(cb(obj));
      }
      return results;
    };
    cleanNo = function(num) {
      num = num.replace(/\+|\s/g, '');
      num = num.replace(/^447/, '07');
      if (/^447/.test(num) && /^\d+$/.test(num)) {
        return num;
      } else {
        return null;
      }
    };
    cleanNos = function(nos) {
      var i, len, num, outno, outnos;
      outnos = [];
      for (i = 0, len = nos.length; i < len; i++) {
        num = nos[i];
        if (outno = cleanNo(num)) {
          outnos.push(outno);
        }
      }
      return outnos;
    };
    fillTemplate = function(template, data) {
      if (template && data) {
        return template.replace(/\{\{(.+?)\}\}/g, function(all, match) {
          var evalInContext;
          evalInContext = function(str, context) {
            return (new Function(`with(this) {return ${str}}`)).call(context);
          };
          return evalInContext(match, data);
        });
      } else {
        return '';
      }
    };
    return ndx.sms = {
      send: function(args, data, cb) {
        var e, smsArgs;
        if (process.env.SMS_API_USERNAME || ndx.settings.SMS_API_USERNAME) {
          try {
            args.numbers = cleanNos(args.numbers);
            args.body = fillTemplate(args.body, data);
          } catch (error) {
            e = error;
            console.log('there was a problem filling the sms template');
            console.log(args.body);
            return typeof cb === "function" ? cb('template error') : void 0;
          }
          if (!args.body) {
            return typeof cb === "function" ? cb('template error') : void 0;
          }
          if (process.env.SMS_OVERRIDE) {
            args.numbers = [process.env.SMS_OVERRIDE];
          }
          if (!process.env.SMS_DISABLE) {
            if (args.numbers.length) {
              smsArgs = {
                UserName: process.env.SMS_API_USERNAME || ndx.settings.SMS_API_USERNAME,
                Password: process.env.SMS_API_PASSWORD || ndx.settings.SMS_API_PASSWORD,
                Mobiles: args.numbers.join(','),
                MessageFrom: process.env.SMS_API_FROM,
                MessageToSend: args.body,
                DateTimeToSend: new Date().toISOString(),
                UserField: '',
                EmailAddressToSendReplies: ''
              };
              return soap.createClient(url, function(err, client) {
                if (err) {
                  console.log(err);
                }
                return client.SendFullSMS(smsArgs, function(err, result) {
                  if (err) {
                    console.log(err, result);
                  }
                  if (err) {
                    safeCallback('error', err);
                  } else {
                    safeCallback('send', response);
                  }
                  return typeof cb === "function" ? cb(err, response) : void 0;
                });
              });
            }
          } else {
            return console.log('sending sms disabled');
          }
        } else {
          console.log('no sms api username');
          return typeof cb === "function" ? cb('no username') : void 0;
        }
      }
    };
  };

}).call(this);

//# sourceMappingURL=index.js.map
