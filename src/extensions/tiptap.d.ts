import '@tiptap/core'

type BookmarkRow = {
  bookmarkRowId: string
  bookmarkRowName: string
}

type SearchResult = {
  from: number
  to: number
}

type SearchAndReplaceStorage = {
  searchTerm: string
  replaceTerm: string
  results: SearchResult[]
  lastSearchTerm: string
  caseSensitive: boolean
  lastCaseSensitive: boolean
  resultIndex: number
  lastResultIndex: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mxmAudio: {
      setAudio: (options: any) => ReturnType
    }
    mxmBookmark: {
      setBookmark: (attributes: any) => ReturnType
      focusBookmark: (bookmarkName: string) => ReturnType
      getAllBookmarks: (callback: (bookmarks: BookmarkRow[]) => void) => ReturnType
    }
    mxmCallout: {
      insertCallout: (options?: any) => ReturnType
    }
    mxmDatetime: {
      insertDatetime: (options?: any) => ReturnType
    }
    mxmEcharts: {
      setEcharts: (options: any) => ReturnType
      updateEcharts: (options: any) => ReturnType
    }
    mxmFile: {
      setFile: (options: any) => ReturnType
      insertFile: (options: any) => ReturnType
      selectFiles: (
        type: string,
        container?: string,
        uploadFileMap?: any,
        autoType?: boolean,
      ) => ReturnType
    }
    mxmFootnote: {
      focusFootnote: (id: string) => ReturnType
    }
    mxmFootnoteReference: {
      addFootnote: () => ReturnType
    }
    mxmFootnoteRules: {
      syncFootnoteCaptions: () => ReturnType
    }
    mxmFormatPainter: {
      setFormatPainter: (once?: boolean) => ReturnType
      unsetFormatPainter: () => ReturnType
    }
    mxmHorizontalRule: {
      setHorizontalRule: (
        options?: {
          type?: string
          color?: string
        },
      ) => ReturnType
    }
    mxmIframe: {
      setIframe: (options: any) => ReturnType
    }
    mxmImage: {
      setImage: (options: any, replace?: boolean) => ReturnType
      setInlineImage: (options: any) => ReturnType
    }
    mxmIndent: {
      setIndent: () => ReturnType
      setOutdent: () => ReturnType
    }
    mxmLetterSpacing: {
      setLetterSpacing: (spacing: string | number | null) => ReturnType
      unsetLetterSpacing: () => ReturnType
    }
    mxmLineHeight: {
      setLineHeight: (lineHeight: string | number) => ReturnType
      unsetLineHeight: () => ReturnType
    }
    mxmMargin: {
      setMargin: (options: any) => ReturnType
      unsetMargin: () => ReturnType
    }
    mxmMention: {
      insertMention: () => ReturnType
    }
    mxmNodeAlign: {
      setNodeAlign: (alignment: string) => ReturnType
      unsetNodeAlign: () => ReturnType
    }
    mxmOptionBox: {
      insertOptionBox: (options: any) => ReturnType
      updateOptionBox: (options: any) => ReturnType
    }
    mxmPageBreak: {
      setPageBreak: () => ReturnType
    }
    mxmSearchAndReplace: {
      setSearchTerm: (searchTerm: string) => ReturnType
      setReplaceTerm: (replaceTerm: string) => ReturnType
      setCaseSensitive: (caseSensitive: boolean) => ReturnType
      resetIndex: () => ReturnType
      nextSearchResult: () => ReturnType
      previousSearchResult: () => ReturnType
      replace: () => ReturnType
      replaceAll: () => ReturnType
    }
    mxmTag: {
      insertTag: (options?: any) => ReturnType
    }
    mxmTextBox: {
      setTextBox: (options: any) => ReturnType
    }
    mxmToc: {
      addTableOfContents: (options?: any) => ReturnType
    }
    mxmTypewriter: {
      startTypewriter: (content: any, options?: any) => ReturnType
      stopTypewriter: () => ReturnType
      getTypewriterState: () => ReturnType
    }
    mxmVideo: {
      setVideo: (options: any) => ReturnType
    }
    mxmWordWrap: {
      setWordWrap: (mode?: string) => ReturnType
      unsetWordWrap: () => ReturnType
      canSetWordWrap: () => ReturnType
    }
  }

  interface Storage {
    container?: any
    options?: any
    searchAndReplace: SearchAndReplaceStorage
  }
}

export {}
