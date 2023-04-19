import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { Prism as PrismSyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import classNames from 'classnames';
import { Tooltip } from 'react-tippy';
import 'react-tippy/dist/tippy.css'
import flourite from 'flourite';
import ChatGPT from './Components/ChatGPT'
import DownloadButton from './Components/DownloadButton';
import CopyButton from './Components/CopyButton';
import { languageToFileExtension, getFileExtension } from './Components/Data'

const currStatus = ['Generating', 'Generating.', 'Generating..', ' Generating...'];

function DocsGen () {

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const [value, setValue] = useState('Input your raw code here:');
  const [response, setResponse] = useState('Your altered code will appear here');
  const [status, setStatus] = useState('Generate Documentation');
  const [loading, isLoading] = useState(false);
  const [language, setLanguage] = useState("Unknown");
  const [fileExtension, setFileExt] = useState('.txt');
  const abortController = useRef(null);
  const chatbot = new ChatGPT();
  const accept = Object.values(languageToFileExtension).join(",");

  useEffect(() => {
    resetAbortController();
  }, []);

  const resetAbortController = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();
  };

  const handleAbort = () => {
    if (abortController.current) {
      abortController.current.abort();
      resetAbortController();
    }
  };

  const buttonClass = classNames(
    'bg-gray-500',
    'w-[100vh]',
    'text-center',
    'h-[5vh]',
    'hover:bg-green-600',
    'rounded-md',
    {
      'text-black': (status === 'Generate Documentation'),
      'text-red-700 shake': (status === 'Error, Click To Try Again'),
      'disabled' : (loading)
    }
  )

  let intervalId;
  var statusChange = 0;

  function statusUpdate () {
    if (statusChange === 0) {
      setStatus(currStatus[0]);
      statusChange++;
    } else if (statusChange === 1) {
      statusChange++;
      setStatus(currStatus[1]);
    } else if (statusChange === 2) {
      statusChange++;
      setStatus(currStatus[2]);
    } else {
      statusChange = 0;
      setStatus(currStatus[3]);
    }
  }

  function startInterval () {
    isLoading(true);
    intervalId = setInterval(statusUpdate, 300);
  }

  function stopInterval () {
    isLoading(false);
    clearInterval(intervalId);
  }

  function handleEditorChange (newValue) {
    if (newValue.includes("Input your raw code here:")) {
      setValue('');
      setLanguage("Unknown");
    } else {
      setValue(newValue);
      getLanguage(newValue);
    }
  }

  function getLanguage (value) {
    setLanguage(flourite(value).language);
    if (language !== "unknown") {
      setFileExt(getFileExtension(language));
    }
  }

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
  }

  async function generateDocs() {
    const textIn = editorRef.current.getValue();
    if (textIn !== "Input your raw code here:" && !(textIn.trim() === '') && (countTokens(value) <= 2048)) {
      startInterval();
      const answer = await chatbot.ask("Properly format and add documentation/comments to this code (keep code under column 100): \n" + textIn, abortController.current);
      setResponse(answer);
      stopInterval();
      setStatus('Generate Documentation');
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      handleEditorChange(event.target.result);
      setValue(event.target.result);
      setResponse("Your altered code will appear here");
    };
    reader.readAsText(file);
  };

  function countTokens (text) {
    const tokenRegExp = /[^\s]+/g;
    const tokens = text.match(tokenRegExp);
    return tokens ? tokens.length : 0;
  }

  function resetButtonClick () {
    setResponse('Your altered code will appear here');
    setValue('Input your raw code here:');
    setStatus('Generate Documentation'); 
    setLanguage("Unknown");
    fileInputRef.current.value = null;   
  };

  return (
    <div className="flex-col w-[100vh] h-[30vh] mx-auto space-y-2">   
      <p className='py-2 text-xs hover:text-green-600 text-white text-center'>
        Programming Language Detected: {language}
      </p>
      <Tooltip
        title={"Can't upload files during generation"}
        disabled={!loading}
        duration={200}
      >
        <input
          className="m-0 block w-full min-w-0 flex-auto rounded border border-solid border-neutral-300 bg-clip-padding px-3 py-[0.32rem] text-base font-normal text-neutral-700 transition duration-300 ease-in-out file:-mx-3 file:-my-[0.32rem] file:overflow-hidden file:rounded-none file:border-0 file:border-solid file:border-inherit file:bg-neutral-100 file:px-3 file:py-[0.32rem] file:text-neutral-700 file:transition file:duration-150 file:ease-in-out file:[border-inline-end-width:1px] file:[margin-inline-end:0.75rem] hover:file:bg-green-600 focus:border-primary focus:text-neutral-700 focus:shadow-te-primary focus:outline-none dark:border-neutral-600 dark:text-neutral-200 dark:file:bg-gray-500 dark:file:text-neutral-100 dark:focus:border-primary"
          type="file"
          onChange={handleFileSelect}
          disabled={loading}
          ref={fileInputRef}
          accept={accept}
        />    
      </Tooltip>
      <Editor
        theme='vs-dark'
        language={language.toLowerCase()}
        onMount={handleEditorDidMount}
        value={value}
        onChange={handleEditorChange}
        className='h-[30vh] rounded-md'
        options={{domReadOnly: loading, readOnly: loading}}
      />
      <button 
        onClick={() => generateDocs()}
        className={buttonClass}
        disabled={loading}
      >
        {status}
      </button>
      <PrismSyntaxHighlighter
        language={language.toLowerCase()}
        style={vscDarkPlus}
        className="h-[30vh] overflow-y-scroll no-scrollbar rounded-md"
      >
        {response}
      </PrismSyntaxHighlighter>
      <div className='flex-row space-x-2'>
        {(!loading && value !== "Input your raw code here:")? (
          <button
            onClick={resetButtonClick}
            className='text-xs bg-gray-500 w-[20vh] h-[4vh] hover:bg-green-600 rounded-md'
          >
            Reset
          </button>
        ) : null}
        {(response !== "Your altered code will appear here" && !loading) ? (
          <CopyButton content={response}/>
        ) : null}
        {(response !== "Your altered code will appear here" && !loading) ? (
          <DownloadButton content={response} fileType={fileExtension}/>
        ) : null}
        {loading ? (
          <button
            className='text-xs bg-gray-500 w-[20vh] h-[4vh] hover:bg-red-600 rounded-md'
            onClick={handleAbort}
          >
            Cancel
          </button>
        ) : null}
        {(countTokens(value) >= 2048) ? (
          <p className='py-2 text-xs text-red-700 text-center'>
            Code input is too long
          </p>
        ) : null}
      </div>
    </div>
  )
};
  
export default DocsGen;
  