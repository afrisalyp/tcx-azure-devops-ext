import axios from 'axios'
import { getRefreshedDeviceToken } from './account'

/**
 * Create an axios instance that can make authenticated requests
 */

export const getToken = () => {
  return new Promise((resolve, reject) => {
    VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService) { // eslint-disable-line no-undef
      // Get value in user scope
      dataService.getValue('access-token', {scopeType: 'User'}).then(function(value) {
        if (!value) {
          return reject(new Error('No token saved.'))
        }
        if (isTokenExpired(value)) {
          dataService.getValue('refresh-token', {scopeType: 'User'}).then(function(refreshToken) {
            if (!refreshToken) {
              alert('Token is expired. Please refresh login.')
              return reject(new Error('Refresh token not found.'))
            }
            getRefreshedDeviceToken(refreshToken).then(res => {
              return resolve(res.data.access_token)
            })
            .catch(e => {
              console.error(e);
              alert('Token is expired. Please refresh login.')
              return reject(new Error('Refresh token failed.'))
            })
          })
          .catch(e => {
            alert('Token is expired. Please refresh login.')
            return reject(new Error('Get refresh token error.'))
          })
        }
        else return resolve(value)
      }).catch(e => {
        console.error(e)
        return reject(e)
      });
    });
  })
}

function urlBase64Decode(str) {
  let output = str.replace(/-/g, '+').replace(/_/g, '/')

  switch (output.length % 4) {
    case 0:
      break 

    case 2:
      output += '=='
      break

    case 3:
      output += '='
      break

    default:
      throw new Error('Illegal base64url string!')
  }
  return decodeURIComponent(escape(atob(output))) //polyfill https://github.com/davidchambers/Base64.js
}

export function decodeToken(token) {
  const parts = token.split('.')

  if (parts.length !== 3) {
    throw new Error('The token is invalid')
  }

  const decoded = urlBase64Decode(parts[1])

  if (!decoded) {
    throw new Error('Cannot decode the token')
  }

  return JSON.parse(decoded)
}

function getTokenExpirationDate(token) {
  const decoded = decodeToken(token)

  if(typeof decoded.exp === 'undefined') {
    return null
  }

  const d = new Date(0) // The 0 here is the key, which sets the date to the epoch
  d.setUTCSeconds(decoded.exp)

  return d
}

function isTokenExpired(token, offsetSeconds = 0) {
  const d = getTokenExpirationDate(token)

  if (d === null) {
    return false
  }

  // Token expired?
  return !(d.valueOf() > (new Date().valueOf() + (offsetSeconds * 1000)))
}

export const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 20000
})

// request interceptor to pass auth token
axiosInstance.interceptors.request.use(config => {
  return getToken()
    .then(token => {
      config.headers['Authorization'] = `Bearer ${token}`
      return config
    })
    .catch((err) => {
      alert('Failed to get token. Please login from the account tab.')
      console.error(err)
      return config
    })
})
