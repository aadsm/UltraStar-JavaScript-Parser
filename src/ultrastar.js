/*
Copyright (c) 2009, António Afonso
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of the António Afonso nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE
*/

/**
 * @fileOverview Object for parsing UltraStar synchronized lyrics.
 * @author <a href="mailto:antonio.afonso@gmail.com">António Afonso</a>
 * @version 0.1.0
 */
 
/**
 * @class <a href="http://en.wikipedia.org/wiki/UltraStar">UltraStar</a> synchronized lyrics parser.
 *
 * Parses UltraStar synchronized lyrics into a JSON-like object to make life easier for anyone who wants to use them on a web application.
 * The current version is incomplete with some missing features, but it works fine for lyrics defined using absolute offset beats.
 * <h2>TODO</h2>
 * <ul>
 *   <li>Support RELATIVE offset beats</li>
 *   <li>Support for VIDEO* tags</li>
 *   <li>Line separator parsing</li>
 * </ul>
 * Information about this format was gathered in different places of the internet:
 * <ul>
 *   <li><a href="http://karaoke.kjams.com/forum/viewtopic.php?f=3&t=395">http://karaoke.kjams.com/forum/viewtopic.php?f=3&t=395</a></li>
 *   <li><a href="http://karaoke.kjams.com/forum/viewtopic.php?f=3&t=395">http://www.dwe-games.com/web/ultrastar/ayuda/html/tut1.htm</a></li>
 * </ul>
 *
 * @param   {String}    text        The synchronized lyrics as read from the .txt file.
 * @param   {Object}    [options]   Currently not in use.
 *
 * @see #getLyrics for the documentation of the JSON-like object structure.
 */
function UltraStarParser( text, options )
{
    /**
     * Original text given on the constructor.
     */
    var _text;
    /**
     * The JSON-like object after {@link #-_text} parsing.
     */
    var _lyrics;
    
    /**
     * Initializes private variables and parses the given input into the JSON-like object.
     *
     * @private
     */
    function init()
    {
        _text = text;
        _lyrics = parseText( text );
    }
    
    /**
     * The parser.
     *
     * @param   {String}    text    The text with the synchronized lyrics to be parsed.
     * @returns {Object}            The JSON-like object created through parsing.
     *
     * @private
     */
    function parseText( text )
    {
        var lyrics =
        {
            sentences   : []
        };
        var syllables = [];
        var lines = text.replace(/\r+/g, '').split( '\n' );
        var gap = 0;
        var bpm = 0;
        var mspb = 0;
        
        for( var i = 0; i < lines.length; i++ )
        {
            var line = lines[i].replace(/^\s*/, '');
            
            // ignore empty lines
            if( line.replace(/\s*/g, '') == "" ) { continue; }
            // parse meta-data
            if( line[0] == '#' )
            {
                var key = line.slice(1, line.indexOf(':')).toLowerCase();
                lyrics[key] = line.slice(line.indexOf(':')+1);
                if( key == 'gap' ) { gap = parseFloat(lyrics.gap); }
                if( key == 'bpm' )
                {
                    bpm = parseFloat(lyrics.bpm.replace(',','.'));
                    mspb = (60*1000)/(bpm*4);
                }
            }
            // parse syllables
            if( line[0] == ':' )
            {
                var arrLine = line.split2(' ', 5).slice(1);
                var offset = Math.floor(parseInt(arrLine[0])*mspb + gap);
                
                syllables.push
                ({
                    start   : offset,
                    //time    : Math.floor((offset/1000/60)%60)+"m"+Math.floor((offset/1000)%60)+"s"+Math.round(offset%1000)+"ms",
                    length  : Math.floor(parseInt(arrLine[1])*mspb),
                    pitch   : parseInt(arrLine[2]),
                    text    : arrLine[3]
                });
            }
            // parse new sentence
            if( line[0] == '-' )
            {
                lyrics.sentences.push
                ({
                    start       : syllables[0].start,
                    text        : syllables.reduce
                    (
                        function(rv, syllable)
                        {
                            return rv+syllable.text;
                        },
                        ""
                    ),
                    syllables   : syllables
                });
                syllables = [];
            }
        }
        
        return lyrics;
    }
    
    /**
     * The parsed text in a JSON-like object.
     * <p>Format of the returned object:</p>
     * <code><pre>
     * {
     *   <b><i>(</i></b><i>&lt;tag&gt;</i>: {String},<b><i>)*</i></b>
     *   sentences:
     *   [<b><i>(</i></b>{
     *     start: {Integer, miliseconds},
     *     text: {String},
     *     syllables:
     *     [<b><i>(</i></b>{
     *       start: {Integer, miliseconds},
     *       length: {Integer, miliseconds},
     *       pitch: {Integer},
     *       text: {String}
     *     },<b><i>)*</i></b>]
     *   },<b><i>)*</i></b>]
     * }
     * </pre></code>
     * All values in miliseconds are absolute.<br>
     * <code><i>&lt;tag&gt;</i></code> are meta data values found in the header of the .txt file.
     *
     * <h2>Example</h2>
     * <code><pre>
     * {
     *   title: "All Star",
     *   artist: "Smash Mouth",
     *   mp3: "05-All Star.mp3",
     *   bpm: "104",
     *   gap: "500",
     *   sentences:
     *   [{
     *     start: 500,
     *     text: "Somebody once told me ",
     *     syllables:
     *     [{
     *        start: 500,
     *        length: 432,
     *        pitch: 54,
     *        text: "Some"
     *      },
     *      {
     *        start: 1076,
     *        length: 288,
     *        pitch: 61,
     *        text: "bo"
     *      },
     *      {
     *        start: 1365,
     *        length: 288,
     *        pitch: 58,
     *        text: "dy "
     *      },
     *      {
     *        start: 1653,
     *        length: 432,
     *        pitch: 58,
     *        text: "once "
     *      },
     *      {
     *        start: 2230,
     *        length: 288,
     *        pitch: 56,
     *        text: "told "
     *      },
     *      {
     *        start: 2519,
     *        length: 288,
     *        pitch: 54,
     *        text: "me "
     *      }]
     *   },
     *   {
     *     start: 2807,
     *     text: "the world is gonna roll  me, ",
     *     syllables: [<i>...</i>]
     *   }]
     * }
     * </pre></code>
     *
     * @returns {Object}    The JSON-like object.
     */
    this.getLyrics = function()
    {
        return _lyrics;
    }
    
    init();
}

/**
 * Split function where the 2nd argument is based on the PHP version.
 *
 * @param {String|Regexp}   delimiter   The String or RegExp used to split the string.
 * @param {Integer}         [max]       If specified, then only substrings up to limit are returned with the rest of the string being placed in the last substring.
 * @returns {Array}                     The array with the substrings of the string split along boundaries matched by <code>delimiter</code>.
 *
 * @augments String
 */
String.prototype.split2 = function( delimiter, max )
{
    max = max || Number.Infinity;
    var arr = [];
    
    if( delimiter.constructor != RegExp )
    {
        arr = this.split(delimiter);
        if( arr.length > max )
        {
            arr.push( arr.splice(max-1, arr.length-max+1).join(delimiter) );
        }
    }
    else
    {
        var old_ix = 0;
        var match;
        
        delimiter.lastIndex = 0; // reset the regexp
        while( match = delimiter.exec(this) )
        {
            arr.push( this.slice(old_ix, delimiter.lastIndex-match[0].length) );
            old_ix = delimiter.lastIndex;            
            if( arr.length+1 == max ) { break; }
        }
        
        arr.push(this.slice(old_ix));
    }
    
    return arr;
}

/**
 * {@see https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduce}
 */
if (!Array.prototype.reduce)
{
  Array.prototype.reduce = function(fun /*, initial*/)
  {
    var len = this.length >>> 0;
    if (typeof fun != "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len == 0 && arguments.length == 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2)
    {
      var rv = arguments[1];
    }
    else
    {
      do
      {
        if (i in this)
        {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      }
      while (true);
    }

    for (; i < len; i++)
    {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  };
}

/**
 * Wrapper function around <code>opera.postError</code> or <code>console.log</code> depending on the browser being used.
 */
function debug() {
    if( window.opera ) {
        opera.postError.apply( opera, arguments );
    } else if( window.console ) {
        console.log.apply( console, arguments );
    }
}