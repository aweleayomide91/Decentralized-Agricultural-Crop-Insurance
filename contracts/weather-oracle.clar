;; Weather Data Oracle Contract
;; Provides verified climate information

(define-data-var admin principal tx-sender)
(define-data-var oracle-address principal tx-sender)

;; Weather data structure
(define-map weather-data
  { location: (string-utf8 100), timestamp: uint }
  {
    temperature: int,
    rainfall: uint,
    humidity: uint,
    wind-speed: uint,
    reported-by: principal,
    reported-at: uint
  }
)

;; Weather events structure (drought, flood, etc.)
(define-map weather-events
  { location: (string-utf8 100), event-id: uint }
  {
    event-type: (string-utf8 50),
    severity: uint,
    start-time: uint,
    end-time: uint,
    confirmed: bool
  }
)

;; Counter for event IDs
(define-data-var event-id-counter uint u0)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Check if caller is oracle
(define-private (is-oracle)
  (is-eq tx-sender (var-get oracle-address))
)

;; Submit weather data (only oracle can do this)
(define-public (submit-weather-data
                (location (string-utf8 100))
                (timestamp uint)
                (temperature int)
                (rainfall uint)
                (humidity uint)
                (wind-speed uint))
  (begin
    (asserts! (is-oracle) (err u1))
    (map-set weather-data
      { location: location, timestamp: timestamp }
      {
        temperature: temperature,
        rainfall: rainfall,
        humidity: humidity,
        wind-speed: wind-speed,
        reported-by: tx-sender,
        reported-at: block-height
      }
    )
    (ok true)
  )
)

;; Report a weather event (only oracle can do this)
(define-public (report-weather-event
                (location (string-utf8 100))
                (event-type (string-utf8 50))
                (severity uint)
                (start-time uint)
                (end-time uint))
  (let ((new-id (+ (var-get event-id-counter) u1)))
    (begin
      (asserts! (is-oracle) (err u1))
      (asserts! (<= severity u10) (err u2)) ;; Severity scale 0-10
      (asserts! (< start-time end-time) (err u3)) ;; Start time must be before end time
      (var-set event-id-counter new-id)
      (map-set weather-events
        { location: location, event-id: new-id }
        {
          event-type: event-type,
          severity: severity,
          start-time: start-time,
          end-time: end-time,
          confirmed: true
        }
      )
      (ok new-id)
    )
  )
)

;; Get weather data
(define-read-only (get-weather-data (location (string-utf8 100)) (timestamp uint))
  (map-get? weather-data { location: location, timestamp: timestamp })
)

;; Get weather event
(define-read-only (get-weather-event (location (string-utf8 100)) (event-id uint))
  (map-get? weather-events { location: location, event-id: event-id })
)

;; Set a new oracle address
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-admin) (err u4))
    (var-set oracle-address new-oracle)
    (ok true)
  )
)

;; Set a new admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err u4))
    (var-set admin new-admin)
    (ok true)
  )
)

