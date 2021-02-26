'use strict'

const { test } = require('tap')
const { Client } = require('..')
const { createServer } = require('http')
const proxy = require('proxy')

test('connect through proxy', async (t) => {
  t.plan(3)

  const server = await buildServer()
  const proxy = await buildProxy()

  const serverUrl = `http://localhost:${server.address().port}`
  const proxyUrl = `http://localhost:${proxy.address().port}`

  server.on('request', (req, res) => {
    t.strictEqual(req.url, '/hello?foo=bar')
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ hello: 'world' }))
  })

  const client = new Client(proxyUrl)

  const response = await client.request({
    method: 'GET',
    path: serverUrl + '/hello?foo=bar'
  })

  response.body.setEncoding('utf8')
  let data = ''
  for await (const chunk of response.body) {
    data += chunk
  }
  t.strictEqual(response.statusCode, 200)
  t.deepEqual(JSON.parse(data), { hello: 'world' })

  server.close()
  proxy.close()
  client.close()
})

test('connect through proxy with auth', async (t) => {
  t.plan(3)

  const server = await buildServer()
  const proxy = await buildProxy()

  const serverUrl = `http://localhost:${server.address().port}`
  const proxyUrl = `http://localhost:${proxy.address().port}`

  proxy.authenticate = function (req, fn) {
    fn(null, req.headers['proxy-authorization'] === `Basic ${Buffer.from('user:pass').toString('base64')}`)
  }

  server.on('request', (req, res) => {
    t.strictEqual(req.url, '/hello?foo=bar')
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ hello: 'world' }))
  })

  const client = new Client(proxyUrl)

  const response = await client.request({
    method: 'GET',
    path: serverUrl + '/hello?foo=bar',
    headers: {
      'proxy-authorization': `Basic ${Buffer.from('user:pass').toString('base64')}`
    }
  })

  response.body.setEncoding('utf8')
  let data = ''
  for await (const chunk of response.body) {
    data += chunk
  }
  t.strictEqual(response.statusCode, 200)
  t.deepEqual(JSON.parse(data), { hello: 'world' })

  server.close()
  proxy.close()
  client.close()
})

function buildServer () {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, () => resolve(server))
  })
}

function buildProxy () {
  return new Promise((resolve, reject) => {
    const server = proxy(createServer())
    server.listen(0, () => resolve(server))
  })
}
