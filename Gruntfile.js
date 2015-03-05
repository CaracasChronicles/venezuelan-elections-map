var fs = require('fs');
var path = require('path');

module.exports = function(grunt) {

    var settings = grunt.file.readJSON('settings.json');
    
    if (!settings || !settings.google_api_key) {
        grunt.log.error("You must first set the 'google_api_key' property in settings.json in order to build project");
        return false;
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            main: { // copy files in root folder
                expand: true,
                cwd: 'src/',
                src: '*',
                dest: 'dist/',
                filter: 'isFile'
            }
        },
        replace: {
            main: {
                options: {
                    patterns: [
                        {json: settings}
                    ]
                },
                files: [
                    { // copy files in root folder
                        expand: true,
                        cwd: 'src/',
                        src: '*',
                        dest: 'dist/',
                        filter: 'isFile'
                    }
                ]
            }
        },
        bower_concat: {
            bower: {
                dest: 'dist/bower.js',
                cssDest: 'dist/bower.css'
            }
        },
        concat: {
            appdata: {
                options: {
                    // concat all JSON together into single object, using filename prefix as the key
                    banner: "{",
                    footer: "}",
                    process: function(src, filepath) {
                        // use /^[^\.]+/ portion of filename as the key
                        return '"'+path.basename(filepath).split(".")[0]+'":'+src;
                    },
                    separator: ','
                },
                src: ['settings.json', 'src/data/*.json'],
                dest: 'dist/appdata.json'
            },
            local: {
                options: {
                    separator: ';',
                    stripBanners: true,
                    sourceMapIn: 'dist/scripts.map',
                    sourceMap: true
                },
                src: [
                    'src/js/numeral.js',
                    'src/js/uitools.js',
                    'src/js/index.js'
                ],
                dest: 'dist/local.js'
            } 
        },
        'minjson': {
            appdata: {                
                files: {
                    'dist/appdata.min.json': 'dist/appdata.json'
                }
            }
        },
        uglify: {
            options: {
                mangle: true,
                sourceMap: true
            },
            bower: {
                src: 'dist/bower.js',
                dest: 'dist/bower.min.js'
            },
            local: {
                src: 'dist/local.js',
                dest: 'dist/local.min.js'
            }        
        },
        watch: {
            options: {
                livereload: true,
                livereloadOnError: false,
                spawn: true
            },                
            appdata: {
                files: ["src/data/*.json"],
                tasks: ['appdata']
            },
            scripts: {
                files: ["*.js", "src/js/*.js"],
                tasks: ['scripts']
            },
            static: {
                files: ["src/*"],
                tasks: ['static']
            }
        },
        connect: {
          server: {
            options: {
              hostname: '*',
              port: 4660,
              base: 'dist'            
            }
          }
        }
    });    
    
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-bower-concat');
    grunt.loadNpmTasks('grunt-minjson');
    grunt.loadNpmTasks('grunt-replace');
    
    grunt.registerTask('default', ['replace', 'bower_concat', 'concat', 'minjson', 'uglify']);
    grunt.registerTask('static',  ['replace']);
    grunt.registerTask('scripts', ['concat:local', 'uglify:local']);
    grunt.registerTask('appdata', ['concat:appdata', 'minjson:appdata']);
    grunt.registerTask('server',  ['connect', 'watch']);
    
};