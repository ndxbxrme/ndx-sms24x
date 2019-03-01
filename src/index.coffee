'use strict'
soap = require 'soap'

module.exports = (ndx) ->
  url = process.env.SMS_API_URL or 'https://www.24x2.com/wssecure/service.asmx?WSDL'
  callbacks = 
    send: []
    error: []
  safeCallback = (name, obj) ->
    for cb in callbacks[name]
      cb obj
  cleanNo = (num) ->
    num = num.replace /\+|\s/g, ''
    num = num.replace /^447/, '07'
    if /^07/.test(num) and /^\d+$/.test(num) then num else null
  cleanNos = (nos) ->
    outnos = []
    for num in nos
      if outno = cleanNo num
        outnos.push outno
    outnos
  fillTemplate = (template, data) ->
    if template and data
      return template.replace /\{\{(.+?)\}\}/g, (all, match) ->
        evalInContext = (str, context) ->
          (new Function("with(this) {return #{str}}"))
          .call context
        evalInContext match, data
    else
      return ''
  ndx.sms =
    send: (args, data, cb) ->
      if process.env.SMS_API_USERNAME or ndx.settings.SMS_API_USERNAME
        try
          args.numbers = cleanNos args.numbers
          args.body = fillTemplate args.body, data
        catch e
          console.log 'there was a problem filling the sms template'
          console.log args.body
          return cb? 'template error'
        if not args.body
          return cb? 'template error'
        if process.env.SMS_OVERRIDE
          args.numbers = [process.env.SMS_OVERRIDE]
        if not process.env.SMS_DISABLE
          if args.numbers.length
            smsArgs =
              UserName: process.env.SMS_API_USERNAME or ndx.settings.SMS_API_USERNAME
              Password: process.env.SMS_API_PASSWORD or ndx.settings.SMS_API_PASSWORD
              Mobiles: args.numbers.join(',')
              MessageFrom: process.env.SMS_API_FROM
              MessageToSend: args.body
              DateTimeToSend: new Date().toISOString()
              UserField: ''
              EmailAddressToSendReplies: ''
            soap.createClient url, (err, client) ->
              console.log err if err
              client.SendFullSMS smsArgs, (err, result) ->
                console.log err, result if err
                if err
                  safeCallback 'error', err
                else
                  safeCallback 'send', result
                cb? err, result
        else
          console.log 'sending sms disabled'
      else
        console.log 'no sms api username'
        cb? 'no username'