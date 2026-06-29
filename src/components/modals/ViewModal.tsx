import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  data: any
  fields: Array<{
    key: string
    label: string
    render?: (value: any) => React.ReactNode
  }>
  items?: Array<{
    key: string
    label: string
    render?: (item: any) => React.ReactNode
  }>
  onPrint?: () => void
}

export function ViewModal({
  open,
  onOpenChange,
  title,
  data,
  fields,
  items,
  onPrint,
}: ViewModalProps) {
  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>{title}</DialogTitle>
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                Print
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fields */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {fields.map((field) => (
              <div key={field.key}>
                <span className="text-gray-500">{field.label}:</span>
                <p className="font-medium">
                  {field.render ? field.render(data[field.key]) : data[field.key] || '-'}
                </p>
              </div>
            ))}
          </div>

          {/* Items Table */}
          {items && items.length > 0 && data[items[0]?.key as string]?.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {items.map((item) => (
                    <TableHead key={item.key}>{item.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data[items[0].key as string].map((item: any, index: number) => (
                  <TableRow key={index}>
                    {items.map((col) => (
                      <TableCell key={col.key}>
                        {col.render ? col.render(item[col.key]) : item[col.key] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onPrint && (
            <Button onClick={onPrint}>Print</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
