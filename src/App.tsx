"use client";
import "./index.css";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "./components/ui/button";
import AuthWrapper from "./components/auth-wrapper";
import { useState } from "react";
import { Badge } from "./components/ui/badge";
import { Card } from "./components/ui/card";
import {
  Table,
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "./components/ui/table";

type Word = {
  english: string;
  pinyin: string;
  characters: string;
  tags: string[];
  id: string;
};

function Content() {
  // each word:
  // * english
  // * pinyin
  // * characters
  // * tags
  // * id (obviously)
  // * history [initially empty]
  const [words, setWords] = useState<Word[]>([
    {
      english: "hello",
      pinyin: "nǐ hǎo",
      characters: "你好",
      tags: ["greeting"],
      id: "1",
    },
    {
      english: "thank you",
      pinyin: "xièxiè",
      characters: "谢谢",
      tags: ["gratitude"],
      id: "2",
    },
    {
      english: "goodbye",
      pinyin: "zàijiàn",
      characters: "再见",
      tags: ["farewell"],
      id: "3",
    },
    {
      english: "please",
      pinyin: "qǐng",
      characters: "请",
      tags: ["politeness"],
      id: "4",
    },
    {
      english: "sorry",
      pinyin: "duìbuqǐ",
      characters: "对不起",
      tags: ["apology"],
      id: "5",
    },
    {
      english: "morning",
      pinyin: "zǎoshang",
      characters: "早上",
      tags: ["time", "greeting"],
      id: "6",
    },
    {
      english: "friend",
      pinyin: "péngyǒu",
      characters: "朋友",
      tags: ["relationship"],
      id: "7",
    },
    {
      english: "water",
      pinyin: "shuǐ",
      characters: "水",
      tags: ["object", "food"],
      id: "8",
    },
    {
      english: "eat",
      pinyin: "chī",
      characters: "吃",
      tags: ["verb", "food"],
      id: "9",
    },
    {
      english: "teacher",
      pinyin: "lǎoshī",
      characters: "老师",
      tags: ["person", "school"],
      id: "10",
    },
  ]);
  return (
    <div className="mt-[10vh] mx-[10vw]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">English</TableHead>
            <TableHead>Pinyin</TableHead>
            <TableHead>Characters</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {words.map((word) => (
            <TableRow key={word.id}>
              <TableCell className="font-medium">{word.english}</TableCell>
              <TableCell><input type="text" className="outline-none" value={word.pinyin} onChange={e => {
                const y = e.target.value;
                setWords(words.map(w => w.id === word.id ? { ...w, pinyin: y } : w));
              }}></input></TableCell>
              <TableCell>{word.characters}</TableCell>
              <TableCell>
                {word.tags.map((tag, idx) => (
                  <Badge key={idx} className="mr-1">
                    {tag}
                  </Badge>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function App() {
  return <AuthWrapper Content={Content} />;
}
