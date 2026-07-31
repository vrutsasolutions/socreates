
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "com.razorpay.cordova.RazorpayCheckout",
          "file": "plugins/com.razorpay.cordova/www/RazorpayCheckout.js",
          "pluginId": "com.razorpay.cordova",
        "clobbers": [
          "RazorpayCheckout"
        ]
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "com.razorpay.cordova": "0.1.0"
    };
    // BOTTOM OF METADATA
    });
    